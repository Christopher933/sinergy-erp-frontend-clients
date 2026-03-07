# Product Base Unit of Measure (UoM) - Requirements Document

## Introduction

The Product Base Unit of Measure (Base UoM) feature enables warehouse managers to designate a fundamental unit for each product that serves as the reference point for all inventory calculations and unit conversions. This feature extends the existing product management system by adding the ability to select and manage a Base UoM from the product's assigned UoMs. The Base UoM ensures consistency across inventory movements, conversions, and reporting by providing a single source of truth for unit-related calculations. All operations maintain multi-tenant isolation and enforce data integrity constraints.

## Glossary

- **Base_UoM**: The fundamental unit of measure selected for a product, used as the reference for all inventory calculations and conversions
- **UoM**: Unit of Measure - a standard unit (e.g., Caja, Pieza, Kilogramo) used to quantify products
- **Assigned_UoMs**: The set of UoMs that have been associated with a specific product through conversion relationships
- **Conversion_Factor**: The numeric multiplier that defines the relationship between two UoMs (e.g., 1 Caja = 50 Piezas)
- **Inventory_Movement**: A transaction that changes product quantity (purchase, sale, adjustment, transfer)
- **Product_Detail_Modal**: The modal dialog for creating or editing product details
- **UoM_Catalog**: The centralized repository of available units of measure at `/uom-catalog`
- **Conversion_Preview**: A visual representation showing the relationship between the selected Base UoM and other assigned UoMs
- **Product_Model**: The backend entity representing a product with all its attributes including base_uom_id
- **REST_API**: Backend endpoints for product operations including Base UoM management
- **Multi_Tenant_Isolation**: Data segregation ensuring Base UoM selections are only visible to their owning tenant

## Requirements

### Requirement 1: Add Base UoM Field to Product Model

**User Story:** As a system architect, I want the Product model to include a Base UoM field, so that each product has a designated reference unit for calculations.

#### Acceptance Criteria

1. WHEN a product is created THEN the system SHALL support storing a base_uom_id field in the Product model
2. WHEN a product is retrieved THEN the system SHALL include the base_uom_id in the response
3. WHEN a product is updated THEN the system SHALL allow updating the base_uom_id field
4. WHEN a product is deleted THEN the system SHALL cascade delete or handle the base_uom_id appropriately
5. THE Product_Model SHALL maintain referential integrity with the UoM catalog

### Requirement 2: Display Base UoM Selection UI in Product Detail Modal

**User Story:** As a warehouse manager, I want to select a Base UoM for each product in the product detail modal, so that I can designate the reference unit for inventory calculations.

#### Acceptance Criteria

1. WHEN the product detail modal opens THEN the system SHALL display a "UoM Base" field in the General tab
2. WHEN the modal is in create mode THEN the system SHALL display the Base UoM field as empty
3. WHEN the modal is in edit mode THEN the system SHALL populate the Base UoM field with the current selection
4. WHEN the Base UoM field is displayed THEN the system SHALL render it as a select dropdown
5. WHEN the dropdown is opened THEN the system SHALL display only the UoMs assigned to the product as options
6. WHEN a user selects a Base UoM THEN the system SHALL update the form state and enable the save button

### Requirement 3: Validate Base UoM Selection

**User Story:** As a system administrator, I want the system to validate Base UoM selections, so that only valid UoMs can be designated as the Base UoM.

#### Acceptance Criteria

1. WHEN a user attempts to save a product with assigned UoMs but no Base UoM selected THEN the system SHALL display a validation error
2. WHEN a user selects a Base UoM that is not in the assigned UoMs list THEN the system SHALL display a validation error
3. WHEN a user selects a valid Base UoM from the assigned UoMs THEN the system SHALL allow the product to be saved
4. WHEN a product has no assigned UoMs THEN the system SHALL not require a Base UoM selection
5. WHEN the Base UoM field is invalid THEN the system SHALL disable the save button

### Requirement 4: Display Conversion Preview

**User Story:** As a warehouse manager, I want to see a conversion preview showing how the selected Base UoM relates to other assigned UoMs, so that I can verify the correct Base UoM is selected.

#### Acceptance Criteria

1. WHEN a Base UoM is selected THEN the system SHALL display a conversion preview section
2. WHEN the conversion preview is displayed THEN the system SHALL show the relationship between the Base UoM and each other assigned UoM
3. WHEN displaying a conversion THEN the system SHALL show the format: "1 [Other_UoM] = [Factor] [Base_UoM]"
4. WHEN a product has only one assigned UoM THEN the system SHALL display a simplified preview
5. WHEN the Base UoM is changed THEN the system SHALL update the conversion preview in real-time

### Requirement 5: Prevent Base UoM Changes with Existing Inventory

**User Story:** As a system administrator, I want to prevent changing the Base UoM when a product has inventory movements, so that historical inventory data remains consistent.

#### Acceptance Criteria

1. WHEN a product has existing inventory movements THEN the system SHALL check for this condition before allowing Base UoM changes
2. WHEN a user attempts to change the Base UoM of a product with inventory movements THEN the system SHALL display a warning message
3. WHEN a warning is displayed THEN the system SHALL show the message: "No se puede cambiar la UoM base si el producto tiene movimientos de inventario"
4. WHEN a user confirms the warning THEN the system SHALL prevent the change and keep the current Base UoM
5. WHEN a product has no inventory movements THEN the system SHALL allow Base UoM changes without restriction

### Requirement 6: Display Base UoM in Product List

**User Story:** As a warehouse manager, I want to see the Base UoM displayed in the product list, so that I can quickly identify the reference unit for each product.

#### Acceptance Criteria

1. WHEN the product list is displayed THEN the system SHALL include a Base UoM column
2. WHEN a product has a Base UoM selected THEN the system SHALL display the Base UoM code in the list
3. WHEN a product has no Base UoM selected THEN the system SHALL display a placeholder or empty state
4. WHEN the product list is sorted THEN the system SHALL support sorting by Base UoM column
5. WHEN the product list is filtered THEN the system SHALL maintain the Base UoM column visibility

### Requirement 7: Persist Base UoM to Backend

**User Story:** As a developer, I want the Base UoM selection to be persisted to the backend, so that the selection is saved and available for future use.

#### Acceptance Criteria

1. WHEN a user saves a product with a Base UoM selection THEN the system SHALL call PATCH /api/tenant/products/{id} with base_uom_id
2. WHEN the API request succeeds THEN the system SHALL display a success message
3. WHEN the API request fails THEN the system SHALL display an error message and keep the modal open
4. WHEN a product is created with a Base UoM THEN the system SHALL include base_uom_id in the POST /api/tenant/products request
5. WHEN the backend receives a base_uom_id THEN the system SHALL validate it against the product's assigned UoMs

### Requirement 8: Handle Base UoM in Product Retrieval

**User Story:** As a developer, I want the Base UoM information to be included when retrieving product details, so that the UI can display and edit the selection.

#### Acceptance Criteria

1. WHEN a product is retrieved via GET /api/tenant/products/{id} THEN the system SHALL include base_uom_id in the response
2. WHEN the response includes base_uom_id THEN the system SHALL include the related UoM details (code, name)
3. WHEN a product list is retrieved THEN the system SHALL include base_uom_id for each product
4. WHEN base_uom_id is null THEN the system SHALL handle it gracefully in the UI

### Requirement 9: Display Helpful Context Information

**User Story:** As a warehouse manager, I want to see helpful information about the Base UoM, so that I understand its purpose and importance.

#### Acceptance Criteria

1. WHEN the Base UoM field is displayed THEN the system SHALL show a help message: "La UoM base se usa para calcular inventarios"
2. WHEN the conversion preview is displayed THEN the system SHALL show the Base UoM designation clearly
3. WHEN a user hovers over the help icon THEN the system SHALL display a tooltip with additional context
4. WHEN the Base UoM field is required THEN the system SHALL indicate this with a required field marker (*)
5. WHEN the Base UoM field is optional THEN the system SHALL not show a required field marker

### Requirement 10: Validate Base UoM Consistency

**User Story:** As a system administrator, I want the system to validate Base UoM consistency, so that the inventory system can rely on a valid reference unit.

#### Acceptance Criteria

1. WHEN a product is saved with a Base UoM THEN the system SHALL verify the Base UoM is in the assigned UoMs list
2. WHEN the Base UoM is not in the assigned UoMs list THEN the system SHALL reject the save and display an error
3. WHEN a product's assigned UoMs are modified THEN the system SHALL check if the current Base UoM is still valid
4. WHEN the Base UoM becomes invalid due to UoM removal THEN the system SHALL alert the user and require a new selection
5. WHEN the Base UoM is valid THEN the system SHALL allow the product to be saved

### Requirement 11: Support Base UoM in Product Search and Filtering

**User Story:** As a warehouse manager, I want to search and filter products by Base UoM, so that I can find products with specific reference units.

#### Acceptance Criteria

1. WHEN the product list search is used THEN the system SHALL support filtering by Base UoM code
2. WHEN a user searches for a Base UoM code THEN the system SHALL return products with matching Base UoM
3. WHEN the product list is filtered THEN the system SHALL maintain the Base UoM filter across pagination
4. WHEN the Base UoM filter is cleared THEN the system SHALL display all products again
5. WHEN multiple filters are applied THEN the system SHALL combine them correctly with Base UoM filter

### Requirement 12: Handle Base UoM in Product Duplication

**User Story:** As a warehouse manager, I want the Base UoM to be handled correctly when duplicating a product, so that the duplicated product has the same reference unit.

#### Acceptance Criteria

1. WHEN a product is duplicated THEN the system SHALL copy the Base UoM from the original product
2. WHEN the duplicated product is created THEN the system SHALL include the same base_uom_id
3. WHEN the duplication is successful THEN the system SHALL display the new product with the copied Base UoM
4. WHEN the Base UoM cannot be copied THEN the system SHALL alert the user and require manual selection

</content>
</invoke>