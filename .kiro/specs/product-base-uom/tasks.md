# Implementation Plan: Product Base Unit of Measure (UoM)

## Overview

This implementation plan breaks down the Product Base UoM feature into discrete, incremental coding tasks. The feature will be built in phases: first updating the Product model and service to support base_uom_id, then extending the product detail modal with Base UoM selection and validation, followed by updating the product list to display Base UoM information, and finally integrating property-based tests to validate correctness properties. Each task builds on previous work, with no orphaned code.

## Tasks

- [x] 1. Update Product model and service to support base_uom_id
  - Add base_uom_id field to Product interface
  - Update CreateProductDto and UpdateProductDto to include base_uom_id
  - Update ProductService methods to handle base_uom_id in requests/responses
  - Add new service methods: getAssignedUoMs(), checkInventoryMovements(), validateBaseUoM()
  - _Requirements: 1.1, 1.2, 1.3, 7.1, 8.1_

- [ ]* 1.1 Write property test for Base UoM persistence round trip
  - **Property 1: Base UoM Persistence Round Trip**
  - **Validates: Requirements 1.1, 1.2, 1.3, 7.1, 8.1**

- [x] 2. Add Base UoM field to product detail modal form
  - Add base_uom_id FormControl to the reactive form
  - Create form field in General tab with label "UoM Base"
  - Add help text: "La UoM base se usa para calcular inventarios"
  - Render as Material select dropdown
  - Set placeholder: "Seleccionar UoM base"
  - _Requirements: 2.1, 2.2, 2.4, 9.1_

- [ ]* 2.1 Write property test for Base UoM field display
  - **Property 12: Modal State Persistence with Base UoM**
  - **Validates: Requirements 2.1, 2.2, 2.4**

- [x] 3. Load assigned UoMs and populate dropdown options
  - Implement loadAssignedUoMs() method in modal component
  - Call productService.getAssignedUoMs() when modal opens
  - Filter dropdown options to show only assigned UoMs
  - Handle loading state while fetching UoMs
  - _Requirements: 2.5, 8.2_

- [ ]* 3.1 Write property test for Base UoM dropdown filtering
  - **Property 2: Base UoM Dropdown Filtering**
  - **Validates: Requirements 2.5**

- [x] 4. Implement Base UoM validation logic
  - Create custom validator: validateBaseUoMInAssignedUoMs()
  - Add required validator when product has assigned UoMs
  - Display validation error messages below field
  - Disable save button when Base UoM invalid
  - _Requirements: 3.1, 3.2, 3.5, 5.1, 5.2_

- [ ]* 4.1 Write property test for Base UoM validation
  - **Property 4: Base UoM Validation - Required When UoMs Assigned**
  - **Property 5: Base UoM Validation - Must Be in Assigned UoMs**
  - **Validates: Requirements 3.1, 3.2, 3.5**

- [x] 5. Implement conversion preview display
  - Create updateConversionPreview() method
  - Calculate conversion factors for each assigned UoM
  - Format preview text: "1 [Other_UoM] = [Factor] [Base_UoM]"
  - Display preview section below Base UoM field
  - Handle single UoM case with simplified preview
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ]* 5.1 Write property test for conversion preview accuracy
  - **Property 3: Conversion Preview Accuracy**
  - **Property 11: Conversion Preview Real-Time Update**
  - **Validates: Requirements 4.2, 4.3, 4.5**

- [x] 6. Implement inventory movement check
  - Call productService.checkInventoryMovements() when editing
  - Display warning message if movements exist
  - Disable Base UoM field when movements exist
  - Show explanation text for disabled field
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ]* 6.1 Write property test for inventory movement prevention
  - **Property 7: Inventory Movement Prevention**
  - **Validates: Requirements 5.1, 5.2, 5.4**

- [x] 7. Handle Base UoM in create and edit modes
  - Populate Base UoM field when editing existing product
  - Keep field empty in create mode
  - Ensure form state reflects current selection
  - _Requirements: 2.3, 2.6, 3.1_

- [ ]* 7.1 Write property test for modal state persistence
  - **Property 12: Modal State Persistence with Base UoM**
  - **Validates: Requirements 2.3, 2.6**

- [x] 8. Update product save logic to include base_uom_id
  - Modify save() method to include base_uom_id in request payload
  - Handle both create and update scenarios
  - Validate base_uom_id before sending to API
  - Display success message on successful save
  - _Requirements: 7.1, 7.4_

- [ ]* 8.1 Write property test for API integration
  - **Property 13: API Integration - Create with Base UoM**
  - **Property 14: API Integration - Update with Base UoM**
  - **Validates: Requirements 7.1, 7.4**

- [x] 9. Implement error handling for Base UoM operations
  - Handle validation errors from API (409 Conflict)
  - Display specific error messages for Base UoM conflicts
  - Keep modal open on error for user correction
  - Handle network errors gracefully
  - _Requirements: 7.3, 8.4_

- [ ]* 9.1 Write property test for error handling
  - **Property 15: Error Handling - API Failure**
  - **Property 16: Base UoM Null Handling**
  - **Validates: Requirements 7.3, 8.4**

- [x] 10. Add Base UoM column to product list table
  - Add Base UoM column to table configuration
  - Set column width to 120px
  - Make column sortable
  - _Requirements: 6.1_

- [ ]* 10.1 Write property test for Base UoM list display
  - **Property 8: Base UoM Display in Product List**
  - **Validates: Requirements 6.2, 6.3**

- [x] 11. Implement Base UoM display in product list
  - Create getBaseUoMDisplay() method to format Base UoM code
  - Display UoM code if base_uom_id exists
  - Display placeholder ("—") if base_uom_id is null
  - _Requirements: 6.2, 6.3_

- [ ]* 11.1 Write property test for Base UoM sorting
  - **Property 9: Base UoM Sorting**
  - **Validates: Requirements 6.4**

- [x] 12. Implement Base UoM sorting in product list
  - Handle column header click for Base UoM column
  - Sort products by base_uom_id
  - Place null values at the end
  - _Requirements: 6.4_

- [ ]* 12.1 Write property test for Base UoM search filtering
  - **Property 10: Base UoM Search Filtering**
  - **Validates: Requirements 11.1, 11.2**

- [x] 13. Implement Base UoM search filtering
  - Update search logic to include Base UoM code
  - Filter products by Base UoM code (case-insensitive)
  - Maintain filter across pagination
  - _Requirements: 11.1, 11.2, 11.3_

- [ ]* 13.1 Write property test for required field indicator
  - **Property 17: Required Field Indicator**
  - **Validates: Requirements 9.4, 9.5**

- [x] 14. Add required field indicator and help text styling
  - Display required marker (*) when Base UoM required
  - Hide required marker when Base UoM optional
  - Style help text appropriately
  - Add tooltip for help icon
  - _Requirements: 9.1, 9.4, 9.5_

- [ ]* 14.1 Write property test for help text display
  - **Property 18: Help Text Display**
  - **Validates: Requirements 9.1**

- [x] 15. Implement Base UoM validation consistency check
  - Add logic to verify Base UoM is in assigned UoMs
  - Check when product's assigned UoMs are modified
  - Alert user if Base UoM becomes invalid
  - Require new selection if Base UoM invalid
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ]* 15.1 Write property test for Base UoM not required when no UoMs
  - **Property 6: Base UoM Not Required When No UoMs Assigned**
  - **Validates: Requirements 3.4**

- [x] 16. Implement Base UoM handling in product duplication
  - Copy base_uom_id from original product
  - Include base_uom_id in duplication request
  - Display duplicated product with copied Base UoM
  - Handle duplication errors gracefully
  - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [ ]* 16.1 Write property test for duplication
  - **Property 19: Duplication Preserves Base UoM**
  - **Validates: Requirements 12.1, 12.2**

- [x] 17. Implement multi-tenant isolation for Base UoM
  - Verify Base UoM selections are tenant-specific
  - Ensure products from other tenants are not visible
  - Verify tenant_id is maintained in all operations
  - _Requirements: 1.1, 1.2, 1.3_

- [ ]* 17.1 Write property test for multi-tenant isolation
  - **Property 20: Multi-Tenant Isolation**
  - **Validates: Requirements 1.1, 1.2, 1.3**

- [x] 18. Add accessibility features for Base UoM field
  - Add aria-labels for Base UoM field and dropdown
  - Ensure keyboard navigation support (Tab, Enter, Escape)
  - Add aria-live regions for validation errors
  - Ensure color contrast meets WCAG standards
  - _Requirements: 2.1, 2.4_

- [x] 19. Checkpoint - Ensure all tests pass
  - Run all unit tests and verify they pass
  - Run all property-based tests with minimum 100 iterations
  - Verify no console errors or warnings
  - Ask the user if questions arise

- [x] 20. Final integration and wiring
  - Wire Base UoM field into product detail modal
  - Wire Base UoM column into product list
  - Verify all CRUD operations work with base_uom_id
  - Verify conversion preview updates correctly
  - Verify inventory movement check works
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1_

- [ ]* 20.1 Write end-to-end integration tests
  - Test complete create flow with Base UoM
  - Test complete edit flow with Base UoM
  - Test Base UoM display in product list
  - Test Base UoM search and filtering
  - Test inventory movement prevention
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1_

- [ ] 21. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests should run with minimum 100 iterations for comprehensive coverage
- All components use Angular Material and follow existing product management patterns
- Multi-tenant isolation is handled automatically by the backend API
- Base UoM validation is performed both on frontend and backend
- Conversion preview is calculated from existing UoM conversion relationships
- Inventory movement check prevents data inconsistency

