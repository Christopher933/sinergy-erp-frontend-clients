# Product Base Unit of Measure (UoM) - Design Document

## Overview

The Product Base Unit of Measure (Base UoM) feature extends the existing product management system by enabling warehouse managers to designate a fundamental unit for each product that serves as the reference point for all inventory calculations and conversions. This feature integrates seamlessly with the existing product detail modal and product list components, adding a new "UoM Base" field in the General tab. The design emphasizes data integrity, user guidance, and consistency by validating that the selected Base UoM is one of the product's assigned UoMs and preventing changes when inventory movements exist. The implementation leverages the existing UoM catalog and conversion relationships to provide real-time conversion previews.

## Architecture

### Component Structure

```
settings/
├── components/
│   ├── product-list/
│   │   ├── product-list.component.ts (updated)
│   │   ├── product-list.component.html (updated)
│   │   └── product-list.component.scss (updated)
│   └── product-detail-modal/
│       ├── product-detail-modal.component.ts (updated)
│       ├── product-detail-modal.component.html (updated)
│       └── product-detail-modal.component.scss (updated)
├── services/
│   ├── product.service.ts (updated)
│   └── uom.service.ts (new or existing)
├── models/
│   └── product.model.ts (updated)
└── settings.module.ts (updated)
```

### Data Flow

```
Product Detail Modal
    ↓
Load Product + Assigned UoMs
    ↓
Display Base UoM Dropdown (filtered to assigned UoMs)
    ↓
User Selects Base UoM
    ↓
Display Conversion Preview
    ↓
Check Inventory Movements (if editing)
    ↓
Validate Base UoM is in Assigned UoMs
    ↓
Save Product with base_uom_id
    ↓
PATCH /api/tenant/products/{id}
    ↓
Backend Validates and Persists
    ↓
Success/Error Response
    ↓
Update Product List Display
```

### State Management

- **Base UoM Selection**: Managed via Reactive Forms FormControl
- **Assigned UoMs**: Loaded from product data and filtered for dropdown options
- **Conversion Preview**: Computed from selected Base UoM and conversion factors
- **Inventory Movement Check**: Performed before allowing Base UoM changes
- **Validation State**: Tracked via form validators and async validators

## Components and Interfaces

### Product Detail Modal Component (Updated)

**Selector**: `app-product-detail-modal`

**New Responsibilities**:
- Display Base UoM selection field in General tab
- Load assigned UoMs for the product
- Display conversion preview based on selected Base UoM
- Check for inventory movements before allowing Base UoM changes
- Validate Base UoM is in assigned UoMs list

**New Methods**:
- `loadAssignedUoMs()`: Fetch UoMs assigned to the product
- `checkInventoryMovements()`: Check if product has inventory movements
- `updateConversionPreview()`: Update preview when Base UoM changes
- `validateBaseUoMInAssignedUoMs()`: Custom validator for Base UoM selection
- `getConversionText(uom)`: Format conversion preview text

**New Signals**:
- `assignedUoMs`: List of UoMs assigned to the product
- `selectedBaseUoM`: Currently selected Base UoM
- `conversionPreview`: Formatted conversion preview text
- `hasInventoryMovements`: Boolean indicating if product has movements
- `baseUoMRequired`: Boolean indicating if Base UoM is required

**New Form Fields**:
- `base_uom_id`: Optional/Required based on assigned UoMs, must be in assigned UoMs list

**Dependencies**:
- ProductService (updated)
- UoMService (new or existing)
- FormBuilder
- MatDialogRef
- MatSnackBar
- ReactiveFormsModule

### Product List Component (Updated)

**New Responsibilities**:
- Display Base UoM column in product table
- Support sorting by Base UoM
- Support filtering by Base UoM code
- Display Base UoM code or placeholder for each product

**New Methods**:
- `getBaseUoMDisplay(product)`: Return Base UoM code or placeholder
- `onBaseUoMSort()`: Handle sorting by Base UoM column

**Updated Signals**:
- `table_config`: Updated to include Base UoM column

**Dependencies**:
- ProductService (updated)
- MatDialog
- MatSnackBar
- DatatableWrapperComponent

### Product Service (Updated)

**New Responsibilities**:
- Include base_uom_id in product CRUD operations
- Fetch assigned UoMs for a product
- Check for inventory movements
- Handle Base UoM validation errors

**Updated Methods**:
- `getProducts(params?)`: Include base_uom_id in response
- `getProduct(id)`: Include base_uom_id and assigned UoMs
- `createProduct(data)`: Accept and persist base_uom_id
- `updateProduct(id, data)`: Accept and persist base_uom_id
- `deleteProduct(id)`: Handle base_uom_id cleanup

**New Methods**:
- `getAssignedUoMs(productId)`: GET /api/tenant/products/{id}/uoms
- `checkInventoryMovements(productId)`: GET /api/tenant/products/{id}/inventory-movements
- `validateBaseUoM(productId, baseUoMId)`: Validate Base UoM is in assigned UoMs

**Dependencies**:
- HttpClient
- environment configuration

## Data Models

### Updated Product Model

```typescript
interface Product {
  id: string;              // UUID
  tenant_id: string;       // UUID
  sku: string;             // Stock Keeping Unit
  name: string;            // Product name
  description: string | null;  // Optional description
  base_uom_id: string | null;  // UUID of Base UoM (nullable)
  created_at: string;      // ISO timestamp
  updated_at: string;      // ISO timestamp
}

interface CreateProductDto {
  sku: string;
  name: string;
  description?: string;
  base_uom_id?: string;    // Optional Base UoM ID
}

interface UpdateProductDto {
  name?: string;
  description?: string;
  sku?: string;
  base_uom_id?: string;    // Optional Base UoM ID
}

interface AssignedUoM {
  id: string;              // UUID
  code: string;            // UoM code (e.g., "Caja", "Pieza")
  name: string;            // UoM name
  conversion_factor?: number;  // Conversion factor from Base UoM
}

interface ConversionPreview {
  baseUoM: AssignedUoM;
  conversions: Array<{
    otherUoM: AssignedUoM;
    factor: number;
    text: string;          // "1 Caja = 50 Piezas (Base)"
  }>;
}

interface InventoryMovement {
  id: string;
  product_id: string;
  quantity: number;
  movement_type: string;
  created_at: string;
}

interface ProductDetailResponse {
  product: Product;
  assigned_uoms: AssignedUoM[];
  has_inventory_movements: boolean;
}
```

### Table Configuration (Updated)

```typescript
interface IDatatableConfig {
  rows: Product[];
  columns: Array<{
    name: string;
    prop: string;
    sortable: boolean;
    canAutoResize: boolean;
    width: number;
  }>;
  // ... existing fields ...
  // New column: Base UoM
  // columns includes: { name: "Base UoM", prop: "base_uom_id", sortable: true, ... }
}
```

## UI/UX Design

### Product Detail Modal - General Tab (Updated)

**New Field Layout**:
- Field Label: "UoM Base" with required indicator (*)
- Help Text: "La UoM base se usa para calcular inventarios"
- Field Type: Select dropdown
- Options: Only assigned UoMs for the product
- Placeholder: "Seleccionar UoM base"

**Conversion Preview Section**:
- Displayed below Base UoM field when a selection is made
- Title: "Vista previa de conversiones"
- Format: "1 [Other_UoM] = [Factor] [Base_UoM]"
- One line per assigned UoM (excluding Base UoM)
- Simplified view if only one assigned UoM

**Inventory Movement Warning**:
- Displayed when editing a product with inventory movements
- Warning Icon + Message: "No se puede cambiar la UoM base si el producto tiene movimientos de inventario"
- Base UoM field disabled if product has movements
- Explanation: "Para cambiar la UoM base, primero debe resolver los movimientos de inventario existentes"

**Styling**:
- Match existing form field styling
- Help text in smaller, lighter font
- Conversion preview in subtle background box
- Warning in yellow/orange alert style
- Required indicator in red

### Product List View (Updated)

**New Column**:
- Column Header: "Base UoM"
- Column Width: 120px
- Sortable: Yes
- Content: Base UoM code or "—" (em dash) if not set
- Alignment: Center

**Interactions**:
- Click column header to sort by Base UoM
- Click row to open detail modal
- Search includes Base UoM code in filter

**Styling**:
- Match existing column styling
- Placeholder text in lighter gray
- Base UoM code in standard font

## Error Handling

### Validation Errors

1. **Base UoM Required** (when product has assigned UoMs)
   - Display: "La UoM base es requerida cuando el producto tiene UoMs asignadas"
   - Action: Highlight Base UoM field, disable save button

2. **Base UoM Not in Assigned UoMs**
   - Display: "La UoM base seleccionada no está en la lista de UoMs asignadas"
   - Action: Highlight Base UoM field, disable save button

3. **Inventory Movements Exist**
   - Display: "No se puede cambiar la UoM base si el producto tiene movimientos de inventario"
   - Action: Disable Base UoM field, show explanation

4. **API Validation Error** (409 Conflict)
   - Display: Error message from API response
   - Action: Keep modal open, highlight Base UoM field

5. **API Error** (500, Network)
   - Display: "Error al guardar el producto. Por favor, intente de nuevo."
   - Action: Keep modal open, show retry option

### User Feedback

- **Success**: Green snackbar "Producto guardado exitosamente"
- **Error**: Red snackbar with error message
- **Loading**: Disabled save button with spinner
- **Warning**: Yellow alert box with warning icon

## Testing Strategy

### Unit Testing

**Product Detail Modal Component**:
- Test Base UoM field displays in General tab
- Test dropdown shows only assigned UoMs
- Test conversion preview updates when Base UoM changes
- Test validation error displays when Base UoM required but not selected
- Test validation error displays when Base UoM not in assigned UoMs
- Test inventory movement warning displays
- Test Base UoM field disabled when inventory movements exist
- Test form submission includes base_uom_id
- Test success/error messages display

**Product List Component**:
- Test Base UoM column displays
- Test Base UoM code displays correctly
- Test placeholder displays when Base UoM not set
- Test sorting by Base UoM column
- Test search filters by Base UoM code

**Product Service**:
- Test getAssignedUoMs calls correct endpoint
- Test checkInventoryMovements calls correct endpoint
- Test validateBaseUoM validates correctly
- Test createProduct includes base_uom_id
- Test updateProduct includes base_uom_id
- Test error handling for validation errors

### Property-Based Testing

Property-based tests will validate universal correctness properties across all inputs and scenarios.

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Base UoM Persistence Round Trip

*For any* product with a valid base_uom_id that is in the assigned UoMs list, saving the product and then retrieving it should result in the same base_uom_id being returned.

**Validates: Requirements 1.1, 1.2, 1.3, 7.1, 8.1**

### Property 2: Base UoM Dropdown Filtering

*For any* product with assigned UoMs, the Base UoM dropdown should display exactly those assigned UoMs and no others.

**Validates: Requirements 2.5**

### Property 3: Conversion Preview Accuracy

*For any* selected Base UoM and set of assigned UoMs, the conversion preview should display the correct conversion factor for each other UoM in the format "1 [Other_UoM] = [Factor] [Base_UoM]".

**Validates: Requirements 4.2, 4.3**

### Property 4: Base UoM Validation - Required When UoMs Assigned

*For any* product with assigned UoMs, attempting to save without selecting a Base UoM should result in a validation error and the product should not be saved.

**Validates: Requirements 3.1, 3.5**

### Property 5: Base UoM Validation - Must Be in Assigned UoMs

*For any* product, attempting to save with a base_uom_id that is not in the assigned UoMs list should result in a validation error and the product should not be saved.

**Validates: Requirements 3.2, 10.1, 10.2**

### Property 6: Base UoM Not Required When No UoMs Assigned

*For any* product with no assigned UoMs, the Base UoM field should not be required and the product should save successfully without a base_uom_id.

**Validates: Requirements 3.4**

### Property 7: Inventory Movement Prevention

*For any* product with existing inventory movements, attempting to change the base_uom_id should result in a warning message and the change should be prevented.

**Validates: Requirements 5.1, 5.2, 5.4**

### Property 8: Base UoM Display in Product List

*For any* product in the list, if it has a base_uom_id, the Base UoM column should display the UoM code; if it has no base_uom_id, the column should display a placeholder.

**Validates: Requirements 6.2, 6.3**

### Property 9: Base UoM Sorting

*For any* product list sorted by Base UoM column, the products should be ordered by their base_uom_id values (with null values at the end).

**Validates: Requirements 6.4**

### Property 10: Base UoM Search Filtering

*For any* search term and product list, filtering by Base UoM code should return only products whose base_uom_id matches the search term (case-insensitive).

**Validates: Requirements 11.1, 11.2**

### Property 11: Conversion Preview Real-Time Update

*For any* product with multiple assigned UoMs, changing the selected Base UoM should immediately update the conversion preview without requiring a page refresh.

**Validates: Requirements 4.5**

### Property 12: Modal State Persistence with Base UoM

*For any* product being edited, opening the detail modal should populate the Base UoM field with the current selection, and closing without saving should not modify the base_uom_id.

**Validates: Requirements 2.3, 2.6**

### Property 13: API Integration - Create with Base UoM

*For any* valid product data including base_uom_id, creating the product should result in a POST request to /api/tenant/products with base_uom_id included in the payload.

**Validates: Requirements 7.4**

### Property 14: API Integration - Update with Base UoM

*For any* product update including a new base_uom_id, the system should call PATCH /api/tenant/products/{id} with base_uom_id in the payload.

**Validates: Requirements 7.1**

### Property 15: Error Handling - API Failure

*For any* API error response when saving a product with base_uom_id, the system should display an error message and keep the modal open for user correction.

**Validates: Requirements 7.3**

### Property 16: Base UoM Null Handling

*For any* product with base_uom_id set to null, the UI should handle it gracefully by displaying a placeholder and not throwing errors.

**Validates: Requirements 8.4**

### Property 17: Required Field Indicator

*For any* product with assigned UoMs, the Base UoM field should display a required field marker (*); for products without assigned UoMs, the marker should not be displayed.

**Validates: Requirements 9.4, 9.5**

### Property 18: Help Text Display

*For any* Base UoM field displayed, the help text "La UoM base se usa para calcular inventarios" should be visible below the field.

**Validates: Requirements 9.1**

### Property 19: Duplication Preserves Base UoM

*For any* product with a base_uom_id, duplicating the product should result in a new product with the same base_uom_id.

**Validates: Requirements 12.1, 12.2**

### Property 20: Multi-Tenant Isolation

*For any* tenant context, the Base UoM selection should only affect products belonging to that tenant, and products from other tenants should not be visible or modifiable.

**Validates: Requirements 1.1, 1.2, 1.3**

## Implementation Notes

### Angular Material Components Used

- `MatSelect`: For Base UoM dropdown
- `MatOption`: For dropdown options
- `MatFormField`: For form field styling
- `MatIcon`: For help icon and warning icon
- `MatTooltip`: For help text tooltip

### Reactive Forms Validators

- `Validators.required`: For Base UoM when product has assigned UoMs
- Custom validator: `validateBaseUoMInAssignedUoMs()` to ensure Base UoM is in assigned UoMs list
- Async validator: `checkInventoryMovements()` to check for inventory movements

### RxJS Operators

- `switchMap`: For chaining API calls (load product → load assigned UoMs → check inventory movements)
- `tap`: For side effects (updating conversion preview)
- `catchError`: For error handling
- `debounceTime`: For search input debouncing
- `distinctUntilChanged`: For preventing duplicate API calls

### Styling Approach

- SCSS modules for component-specific styles
- Tailwind CSS utility classes for layout
- CSS Grid for form layout
- Flexbox for preview section
- Material Design color scheme for warnings

### Performance Considerations

- Load assigned UoMs only when modal opens
- Cache assigned UoMs to avoid repeated API calls
- Debounce search input to reduce API calls
- Use OnPush change detection strategy
- Lazy load conversion preview only when Base UoM selected

### Accessibility

- Use semantic HTML (select, label, button elements)
- Provide aria-labels for icon buttons
- Ensure color contrast meets WCAG standards
- Support keyboard navigation (Tab, Enter, Escape)
- Announce validation errors to screen readers via aria-live regions
- Provide help text for required fields

### API Endpoints Required

- `GET /api/tenant/products/{id}`: Include base_uom_id in response
- `GET /api/tenant/products/{id}/uoms`: Get assigned UoMs for product
- `GET /api/tenant/products/{id}/inventory-movements`: Check for inventory movements
- `PATCH /api/tenant/products/{id}`: Accept base_uom_id in request body
- `POST /api/tenant/products`: Accept base_uom_id in request body

### Backend Validation

- Validate base_uom_id is in assigned UoMs list
- Validate base_uom_id exists in UoM catalog
- Prevent Base UoM changes if inventory movements exist
- Maintain referential integrity with UoM catalog
- Cascade handle base_uom_id on product deletion

