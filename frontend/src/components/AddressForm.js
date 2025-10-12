/**
 * @module components/AddressForm
 * @description Standardized address form component with US states dropdown and validation
 * Provides reusable form for capturing user addresses with proper validation
 * Migrated to ES6 modules: October 11, 2025 (Batch 5)
 */

// US States data for dropdown
const US_STATES = [
    { code: 'AL', name: 'Alabama' },
    { code: 'AK', name: 'Alaska' },
    { code: 'AZ', name: 'Arizona' },
    { code: 'AR', name: 'Arkansas' },
    { code: 'CA', name: 'California' },
    { code: 'CO', name: 'Colorado' },
    { code: 'CT', name: 'Connecticut' },
    { code: 'DE', name: 'Delaware' },
    { code: 'FL', name: 'Florida' },
    { code: 'GA', name: 'Georgia' },
    { code: 'HI', name: 'Hawaii' },
    { code: 'ID', name: 'Idaho' },
    { code: 'IL', name: 'Illinois' },
    { code: 'IN', name: 'Indiana' },
    { code: 'IA', name: 'Iowa' },
    { code: 'KS', name: 'Kansas' },
    { code: 'KY', name: 'Kentucky' },
    { code: 'LA', name: 'Louisiana' },
    { code: 'ME', name: 'Maine' },
    { code: 'MD', name: 'Maryland' },
    { code: 'MA', name: 'Massachusetts' },
    { code: 'MI', name: 'Michigan' },
    { code: 'MN', name: 'Minnesota' },
    { code: 'MS', name: 'Mississippi' },
    { code: 'MO', name: 'Missouri' },
    { code: 'MT', name: 'Montana' },
    { code: 'NE', name: 'Nebraska' },
    { code: 'NV', name: 'Nevada' },
    { code: 'NH', name: 'New Hampshire' },
    { code: 'NJ', name: 'New Jersey' },
    { code: 'NM', name: 'New Mexico' },
    { code: 'NY', name: 'New York' },
    { code: 'NC', name: 'North Carolina' },
    { code: 'ND', name: 'North Dakota' },
    { code: 'OH', name: 'Ohio' },
    { code: 'OK', name: 'Oklahoma' },
    { code: 'OR', name: 'Oregon' },
    { code: 'PA', name: 'Pennsylvania' },
    { code: 'RI', name: 'Rhode Island' },
    { code: 'SC', name: 'South Carolina' },
    { code: 'SD', name: 'South Dakota' },
    { code: 'TN', name: 'Tennessee' },
    { code: 'TX', name: 'Texas' },
    { code: 'UT', name: 'Utah' },
    { code: 'VT', name: 'Vermont' },
    { code: 'VA', name: 'Virginia' },
    { code: 'WA', name: 'Washington' },
    { code: 'WV', name: 'West Virginia' },
    { code: 'WI', name: 'Wisconsin' },
    { code: 'WY', name: 'Wyoming' },
    { code: 'DC', name: 'District of Columbia' },
    { code: 'AS', name: 'American Samoa' },
    { code: 'GU', name: 'Guam' },
    { code: 'MP', name: 'Northern Mariana Islands' },
    { code: 'PR', name: 'Puerto Rico' },
    { code: 'VI', name: 'U.S. Virgin Islands' }
];

/**
 * Create a standardized address form with proper validation
 * @param {Object} options - Configuration options
 * @param {string} options.containerId - ID of container element
 * @param {Object} options.initialValues - Initial form values
 * @param {Function} options.onChange - Callback when form changes
 * @param {boolean} options.required - Whether fields are required
 */
function createAddressForm(options = {}) {
    const {
        containerId,
        initialValues = {},
        onChange = () => {},
        required = false
    } = options;

    const container = document.getElementById(containerId);
    if (!container) {
        if (typeof adminDebugError !== 'undefined') {
            adminDebugError('AddressForm', `Container element with ID '${containerId}' not found`);
        }
        return null;
    }

    // Create state options HTML
    const stateOptions = US_STATES.map(state => 
        `<option value="${state.code}" ${initialValues.state === state.code ? 'selected' : ''}>
            ${state.code}
         </option>`
    ).join('');

    // Build form HTML
    const formHTML = `
        <div class="address-form">
            <div class="form-group">
                <label for="${containerId}_streetAddress">
                    Street Address ${required ? '*' : ''}
                </label>
                <input
                    type="text"
                    id="${containerId}_streetAddress"
                    name="streetAddress"
                    value="${initialValues.streetAddress || ''}"
                    placeholder="123 Main Street"
                    ${required ? 'required' : ''}
                    class="address-input"
                >
            </div>

            <div class="form-group">
                <label for="${containerId}_streetAddress2">
                    Apartment, Suite, Unit, Building, Floor (Optional)
                </label>
                <input
                    type="text"
                    id="${containerId}_streetAddress2"
                    name="streetAddress2"
                    value="${initialValues.streetAddress2 || ''}"
                    placeholder="Apt 4B, Suite 200, Unit 5, etc."
                    class="address-input"
                >
            </div>
            
            <div class="form-row">
                <div class="form-group form-group-half">
                    <label for="${containerId}_city">
                        City ${required ? '*' : ''}
                    </label>
                    <input 
                        type="text" 
                        id="${containerId}_city" 
                        name="city"
                        value="${initialValues.city || ''}"
                        placeholder="Springfield"
                        ${required ? 'required' : ''}
                        class="address-input"
                    >
                </div>
                
                <div class="form-group form-group-quarter">
                    <label for="${containerId}_state">
                        State ${required ? '*' : ''}
                    </label>
                    <select 
                        id="${containerId}_state" 
                        name="state"
                        ${required ? 'required' : ''}
                        class="address-select"
                    >
                        <option value="">Select State</option>
                        ${stateOptions}
                    </select>
                </div>
                
                <div class="form-group form-group-quarter">
                    <label for="${containerId}_zipCode">
                        ZIP Code ${required ? '*' : ''}
                    </label>
                    <input 
                        type="text" 
                        id="${containerId}_zipCode" 
                        name="zipCode"
                        value="${initialValues.zipCode || ''}"
                        placeholder="62701"
                        pattern="[0-9]{5}(-[0-9]{4})?"
                        maxlength="10"
                        ${required ? 'required' : ''}
                        class="address-input"
                    >
                </div>
            </div>
            
            <div class="address-validation-message" id="${containerId}_validation" style="display: none;"></div>
        </div>
    `;

    // Add CSS styles if not already present
    if (!document.getElementById('address-form-styles')) {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'address-form-styles';
        styleSheet.textContent = `
            .address-form {
                background: #f9f9f9;
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                padding: 1rem;
                margin: 0.5rem 0;
            }
            
            .form-row {
                display: flex;
                gap: 1rem;
                align-items: end;
            }
            
            .form-group-half {
                flex: 2;
            }
            
            .form-group-quarter {
                flex: 1;
            }
            
            .address-input, .address-select {
                width: 100%;
                padding: 0.6rem;
                border: 1px solid #ccc;
                border-radius: 4px;
                font-size: 0.95rem;
                box-sizing: border-box;
                transition: border-color 0.2s ease;
            }
            
            .address-input:focus, .address-select:focus {
                outline: none;
                border-color: #4b5c09;
                box-shadow: 0 0 0 2px rgba(75, 92, 9, 0.1);
            }
            
            .address-input.invalid, .address-select.invalid {
                border-color: #d32f2f;
            }
            
            .address-validation-message {
                margin-top: 0.5rem;
                padding: 0.5rem;
                border-radius: 4px;
                font-size: 0.9rem;
            }
            
            .address-validation-message.error {
                background: #ffebee;
                color: #d32f2f;
                border: 1px solid #ffcdd2;
            }
            
            .address-validation-message.success {
                background: #e8f5e8;
                color: #2e7d32;
                border: 1px solid #c8e6c9;
            }
            
            @media (max-width: 600px) {
                .form-row {
                    flex-direction: column;
                    gap: 0;
                }
                
                .form-group-half, .form-group-quarter {
                    flex: none;
                    width: 100%;
                }
            }
        `;
        document.head.appendChild(styleSheet);
    }

    // Insert form HTML
    container.innerHTML = formHTML;

    // Add event listeners for validation and change detection
    const inputs = container.querySelectorAll('.address-input, .address-select');
    const validationDiv = container.querySelector(`#${containerId}_validation`);

    inputs.forEach(input => {
        input.addEventListener('input', () => {
            validateField(input);
            onChange(getFormData());
        });
        
        input.addEventListener('blur', () => {
            validateField(input);
        });
    });

    // Validation functions
    function validateField(field) {
        const value = field.value.trim();
        const fieldName = field.name;
        let isValid = true;
        let message = '';

        // Clear previous validation state
        field.classList.remove('invalid');

        if (required && !value) {
            isValid = false;
            message = `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
        } else if (fieldName === 'zipCode' && value) {
            const zipPattern = /^[0-9]{5}(-[0-9]{4})?$/;
            if (!zipPattern.test(value)) {
                isValid = false;
                message = 'ZIP code must be in format 12345 or 12345-6789';
            }
        } else if (fieldName === 'state' && value && !US_STATES.find(s => s.code === value)) {
            isValid = false;
            message = 'Please select a valid state';
        }

        if (!isValid) {
            field.classList.add('invalid');
            showValidationMessage(message, 'error');
        } else {
            hideValidationMessage();
        }

        return isValid;
    }

    function showValidationMessage(message, type = 'error') {
        validationDiv.textContent = message;
        validationDiv.className = `address-validation-message ${type}`;
        validationDiv.style.display = 'block';
    }

    function hideValidationMessage() {
        validationDiv.style.display = 'none';
    }

    function getFormData() {
        const data = {};
        inputs.forEach(input => {
            data[input.name] = input.value.trim();
        });
        return data;
    }

    function validateForm() {
        let isValid = true;
        inputs.forEach(input => {
            if (!validateField(input)) {
                isValid = false;
            }
        });
        return isValid;
    }

    function setFormData(data) {
        Object.keys(data).forEach(key => {
            const input = container.querySelector(`[name="${key}"]`);
            if (input) {
                input.value = data[key] || '';
            }
        });
    }

    function clearForm() {
        inputs.forEach(input => {
            input.value = '';
            input.classList.remove('invalid');
        });
        hideValidationMessage();
    }

    // Return API object
    return {
        validate: validateForm,
        getData: getFormData,
        setData: setFormData,
        clear: clearForm,
        container: container
    };
}

// ES6 Module Exports
export { createAddressForm, US_STATES };
export default createAddressForm;

// Maintain backward compatibility during transition
if (typeof window !== 'undefined') {
    window.createAddressForm = createAddressForm;
    window.US_STATES = US_STATES;
}