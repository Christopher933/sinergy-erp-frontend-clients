import { describe, it, expect } from 'vitest';

/**
 * Unit tests for conversion preview calculation logic
 * These tests verify the core logic without requiring component setup
 */

describe('Conversion Preview Logic', () => {
  // Helper function to calculate conversion factor (extracted from component)
  function getConversionFactor(fromUoMId: string, toUoMId: string, relationships: any[]): number | null {
    // Look for a direct relationship from fromUoMId to toUoMId
    const directRelationship = relationships.find(
      rel => rel.source_uom_id === fromUoMId && rel.target_uom_id === toUoMId
    );

    if (directRelationship) {
      return directRelationship.conversion_factor;
    }

    // Look for an inverse relationship (toUoMId to fromUoMId) and invert the factor
    const inverseRelationship = relationships.find(
      rel => rel.source_uom_id === toUoMId && rel.target_uom_id === fromUoMId
    );

    if (inverseRelationship) {
      return 1 / inverseRelationship.conversion_factor;
    }

    // No relationship found
    return null;
  }

  // Helper function to update conversion preview (extracted from component)
  function updateConversionPreview(baseUoMId: string, assignedUoMs: any[], relationships: any[]): any[] {
    const baseUoM = assignedUoMs.find(uom => uom.id === baseUoMId);
    if (!baseUoM) {
      return [];
    }

    const preview: any[] = [];

    // For each assigned UoM (except the base UoM), calculate the conversion factor
    for (const otherUoM of assignedUoMs) {
      if (otherUoM.id === baseUoMId) {
        // Skip the base UoM itself
        continue;
      }

      // Find the conversion factor from otherUoM to baseUoM
      const factor = getConversionFactor(otherUoM.id, baseUoMId, relationships);
      
      if (factor !== null) {
        preview.push({
          otherUoM: otherUoM,
          baseUoM: baseUoM,
          factor: factor,
          text: `1 ${otherUoM.code || otherUoM.name} = ${factor} ${baseUoM.code || baseUoM.name}`
        });
      }
    }

    return preview;
  }

  it('should calculate direct conversion factor', () => {
    const relationships = [
      { id: 'rel1', source_uom_id: 'uom2', target_uom_id: 'uom1', conversion_factor: 50 }
    ];

    const factor = getConversionFactor('uom2', 'uom1', relationships);
    expect(factor).toBe(50);
  });

  it('should calculate inverse conversion factor', () => {
    const relationships = [
      { id: 'rel1', source_uom_id: 'uom1', target_uom_id: 'uom2', conversion_factor: 50 }
    ];

    const factor = getConversionFactor('uom2', 'uom1', relationships);
    expect(factor).toBeCloseTo(0.02, 5);
  });

  it('should return null when no relationship exists', () => {
    const relationships: any[] = [];

    const factor = getConversionFactor('uom1', 'uom2', relationships);
    expect(factor).toBeNull();
  });

  it('should generate conversion preview with single conversion', () => {
    const assignedUoMs = [
      { id: 'uom1', name: 'Caja', code: 'CJA' },
      { id: 'uom2', name: 'Pieza', code: 'PZA' }
    ];
    const relationships = [
      { id: 'rel1', source_uom_id: 'uom2', target_uom_id: 'uom1', conversion_factor: 50 }
    ];

    const preview = updateConversionPreview('uom1', assignedUoMs, relationships);

    expect(preview.length).toBe(1);
    expect(preview[0].text).toBe('1 PZA = 50 CJA');
    expect(preview[0].factor).toBe(50);
  });

  it('should generate conversion preview with multiple conversions', () => {
    const assignedUoMs = [
      { id: 'uom1', name: 'Caja', code: 'CJA' },
      { id: 'uom2', name: 'Pieza', code: 'PZA' },
      { id: 'uom3', name: 'Kilogramo', code: 'KG' }
    ];
    const relationships = [
      { id: 'rel1', source_uom_id: 'uom2', target_uom_id: 'uom1', conversion_factor: 50 },
      { id: 'rel2', source_uom_id: 'uom3', target_uom_id: 'uom1', conversion_factor: 25 }
    ];

    const preview = updateConversionPreview('uom1', assignedUoMs, relationships);

    expect(preview.length).toBe(2);
    expect(preview[0].text).toContain('50');
    expect(preview[1].text).toContain('25');
  });

  it('should skip base UoM in conversion preview', () => {
    const assignedUoMs = [
      { id: 'uom1', name: 'Caja', code: 'CJA' },
      { id: 'uom2', name: 'Pieza', code: 'PZA' }
    ];
    const relationships = [
      { id: 'rel1', source_uom_id: 'uom2', target_uom_id: 'uom1', conversion_factor: 50 }
    ];

    const preview = updateConversionPreview('uom1', assignedUoMs, relationships);

    // Should not include conversion from Caja to Caja
    const previewTexts = preview.map(p => p.text);
    expect(previewTexts.every(t => !t.includes('CJA = '))).toBe(true);
  });

  it('should handle missing conversion relationships gracefully', () => {
    const assignedUoMs = [
      { id: 'uom1', name: 'Caja', code: 'CJA' },
      { id: 'uom2', name: 'Pieza', code: 'PZA' },
      { id: 'uom3', name: 'Kilogramo', code: 'KG' }
    ];
    // Only relationship between uom1 and uom2
    const relationships = [
      { id: 'rel1', source_uom_id: 'uom2', target_uom_id: 'uom1', conversion_factor: 50 }
    ];

    const preview = updateConversionPreview('uom1', assignedUoMs, relationships);

    // Should only show conversion for uom2, not uom3 (no relationship)
    expect(preview.length).toBe(1);
    expect(preview[0].text).toContain('PZA');
  });

  it('should return empty preview for single UoM', () => {
    const assignedUoMs = [
      { id: 'uom1', name: 'Caja', code: 'CJA' }
    ];
    const relationships: any[] = [];

    const preview = updateConversionPreview('uom1', assignedUoMs, relationships);

    // No other UoMs to convert
    expect(preview.length).toBe(0);
  });

  it('should return empty preview when base UoM not found', () => {
    const assignedUoMs = [
      { id: 'uom1', name: 'Caja', code: 'CJA' }
    ];
    const relationships: any[] = [];

    const preview = updateConversionPreview('invalid-id', assignedUoMs, relationships);

    expect(preview.length).toBe(0);
  });

  it('should format preview text with code when available', () => {
    const assignedUoMs = [
      { id: 'uom1', name: 'Caja', code: 'CJA' },
      { id: 'uom2', name: 'Pieza', code: 'PZA' }
    ];
    const relationships = [
      { id: 'rel1', source_uom_id: 'uom2', target_uom_id: 'uom1', conversion_factor: 50 }
    ];

    const preview = updateConversionPreview('uom1', assignedUoMs, relationships);

    expect(preview[0].text).toBe('1 PZA = 50 CJA');
  });

  it('should format preview text with name when code not available', () => {
    const assignedUoMs = [
      { id: 'uom1', name: 'Caja' },
      { id: 'uom2', name: 'Pieza' }
    ];
    const relationships = [
      { id: 'rel1', source_uom_id: 'uom2', target_uom_id: 'uom1', conversion_factor: 50 }
    ];

    const preview = updateConversionPreview('uom1', assignedUoMs, relationships);

    expect(preview[0].text).toBe('1 Pieza = 50 Caja');
  });

  it('should handle decimal conversion factors', () => {
    const assignedUoMs = [
      { id: 'uom1', name: 'Kilogramo', code: 'KG' },
      { id: 'uom2', name: 'Gramo', code: 'G' }
    ];
    const relationships = [
      { id: 'rel1', source_uom_id: 'uom2', target_uom_id: 'uom1', conversion_factor: 0.001 }
    ];

    const preview = updateConversionPreview('uom1', assignedUoMs, relationships);

    expect(preview.length).toBe(1);
    expect(preview[0].factor).toBe(0.001);
    expect(preview[0].text).toBe('1 G = 0.001 KG');
  });
});
