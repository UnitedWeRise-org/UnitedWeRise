/**
 * @module core/auth/integration-test
 * @description Comprehensive test suite for unified authentication system
 * Verifies that all authentication systems stay perfectly synchronized
 * 
 * Run this in the browser console to test the integration:
 * import('./src/modules/core/auth/integration-test.js').then(test => test.runAllTests());
 */

import { unifiedAuthManager } from './unified-manager.js';
import { apiClient } from '../api/client.js';
import { userState } from '../state/user.js';

/**
 * Test result structure
 * @typedef {Object} TestResult
 * @property {string} name - Test name
 * @property {boolean} passed - Whether test passed
 * @property {string} message - Test result message
 * @property {any} details - Additional test details
 */

/**
 * Authentication Integration Test Suite
 */
class AuthIntegrationTest {
    constructor() {
        this.testResults = [];
        this.originalUser = null;
        this.originalCsrfToken = null;
    }

    /**
     * Setup test environment
     */
    async setup() {
        console.log('🧪 Setting up authentication integration tests...');
        
        // Store original state
        this.originalUser = unifiedAuthManager.user;
        this.originalCsrfToken = unifiedAuthManager.csrfToken;
        
        // Clear any existing state for clean testing
        if (unifiedAuthManager.isAuthenticated) {
            console.log('⚠️ User currently authenticated - tests will work with current session');
        }
    }

    /**
     * Cleanup test environment
     */
    async cleanup() {
        console.log('🧹 Cleaning up authentication integration tests...');
        
        // Restore original state if needed
        if (this.originalUser && !unifiedAuthManager.isAuthenticated) {
            unifiedAuthManager.setAuthenticatedUser(this.originalUser, this.originalCsrfToken);
        }
    }

    /**
     * Add test result
     * @param {string} name - Test name
     * @param {boolean} passed - Whether test passed
     * @param {string} message - Test result message
     * @param {any} details - Additional details
     */
    addResult(name, passed, message, details = null) {
        const result = { name, passed, message, details };
        this.testResults.push(result);
        
        const status = passed ? '✅' : '❌';
        console.log(`${status} ${name}: ${message}`);
        
        if (details) {
            console.log('   Details:', details);
        }
    }

    /**
     * Test 1: Verify unified manager initialization
     */
    async testUnifiedManagerInitialization() {
        const testName = 'Unified Manager Initialization';
        
        try {
            // Check if unified manager exists
            if (!unifiedAuthManager) {
                this.addResult(testName, false, 'Unified auth manager not available');
                return;
            }
            
            // Check if manager has required methods
            const requiredMethods = ['login', 'logout', 'setAuthenticatedUser', 'clearAuthentication', 'subscribe'];
            const missingMethods = requiredMethods.filter(method => typeof unifiedAuthManager[method] !== 'function');
            
            if (missingMethods.length > 0) {
                this.addResult(testName, false, `Missing methods: ${missingMethods.join(', ')}`);
                return;
            }
            
            // Check if manager is properly exposed globally
            if (window.unifiedAuthManager !== unifiedAuthManager) {
                this.addResult(testName, false, 'Unified auth manager not properly exposed globally');
                return;
            }
            
            this.addResult(testName, true, 'Unified auth manager properly initialized');
            
        } catch (error) {
            this.addResult(testName, false, `Error during initialization test: ${error.message}`, error);
        }
    }

    /**
     * Test 2: Verify state synchronization
     */
    async testStateSynchronization() {
        const testName = 'State Synchronization';
        
        try {
            // Create mock user data
            const mockUser = {
                id: 'test-123',
                username: 'testuser',
                email: 'test@example.com',
                firstName: 'Test'
            };
            const mockCsrfToken = 'test-csrf-token';
            
            // Set user via unified manager
            unifiedAuthManager.setAuthenticatedUser(mockUser, mockCsrfToken);
            
            // Verify synchronization across all systems
            const checks = [];
            
            // Check unified manager state
            checks.push({
                system: 'Unified Manager',
                userCheck: unifiedAuthManager.user?.id === mockUser.id,
                authCheck: unifiedAuthManager.isAuthenticated === true,
                csrfCheck: unifiedAuthManager.csrfToken === mockCsrfToken
            });
            
            // Check global window state
            checks.push({
                system: 'Global Window',
                userCheck: window.currentUser?.id === mockUser.id,
                csrfCheck: window.csrfToken === mockCsrfToken
            });
            
            // Check userState module
            checks.push({
                system: 'UserState Module',
                userCheck: userState.current?.id === mockUser.id,
                authCheck: userState.isAuthenticated === true
            });
            
            // Check localStorage
            const storedUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
            checks.push({
                system: 'LocalStorage',
                userCheck: storedUser?.id === mockUser.id
            });
            
            // Check API client
            checks.push({
                system: 'API Client',
                csrfCheck: apiClient.csrfToken === mockCsrfToken
            });
            
            // Evaluate results
            const failedChecks = checks.filter(check => 
                (check.userCheck === false) || 
                (check.authCheck === false) || 
                (check.csrfCheck === false)
            );
            
            if (failedChecks.length === 0) {
                this.addResult(testName, true, 'All systems properly synchronized');
            } else {
                this.addResult(testName, false, `Synchronization failed in: ${failedChecks.map(c => c.system).join(', ')}`, failedChecks);
            }
            
            // Clean up
            unifiedAuthManager.clearAuthentication();
            
        } catch (error) {
            this.addResult(testName, false, `Error during synchronization test: ${error.message}`, error);
        }
    }

    /**
     * Test 3: Verify event dispatch
     */
    async testEventDispatch() {
        const testName = 'Event Dispatch';
        
        try {
            const eventsReceived = [];
            
            // Setup event listeners
            const eventTypes = ['userLoggedIn', 'userLoggedOut', 'authStateChanged', 'userStateChanged'];
            const listeners = eventTypes.map(eventType => {
                const listener = (event) => {
                    eventsReceived.push({
                        type: eventType,
                        detail: event.detail,
                        timestamp: Date.now()
                    });
                };
                window.addEventListener(eventType, listener);
                return { eventType, listener };
            });
            
            // Test login events
            const mockUser = {
                id: 'test-456',
                username: 'eventtest',
                email: 'event@example.com'
            };
            
            unifiedAuthManager.setAuthenticatedUser(mockUser, 'test-token');
            
            // Wait for events to propagate
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Test logout events
            unifiedAuthManager.clearAuthentication();
            
            // Wait for events to propagate
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Cleanup listeners
            listeners.forEach(({ eventType, listener }) => {
                window.removeEventListener(eventType, listener);
            });
            
            // Check results
            const loginEvents = eventsReceived.filter(e => ['userLoggedIn', 'authStateChanged'].includes(e.type) && 
                (e.detail?.user?.id === mockUser.id || e.detail?.authenticated === true));
            const logoutEvents = eventsReceived.filter(e => ['userLoggedOut', 'authStateChanged'].includes(e.type) && 
                (e.detail?.authenticated === false || e.type === 'userLoggedOut'));
            
            if (loginEvents.length > 0 && logoutEvents.length > 0) {
                this.addResult(testName, true, `Events properly dispatched: ${eventsReceived.length} total events`);
            } else {
                this.addResult(testName, false, 'Required events not dispatched', eventsReceived);
            }
            
        } catch (error) {
            this.addResult(testName, false, `Error during event dispatch test: ${error.message}`, error);
        }
    }

    /**
     * Test 4: Verify UI updates
     */
    async testUIUpdates() {
        const testName = 'UI Updates';
        
        try {
            // Store original UI state
            const originalAuthSection = document.getElementById('authSection')?.style.display;
            const originalUserSection = document.getElementById('userSection')?.style.display;
            const originalUserGreeting = document.getElementById('userGreeting')?.textContent;
            
            // Test authenticated UI
            const mockUser = {
                id: 'test-789',
                username: 'uitest',
                firstName: 'UI Test',
                email: 'ui@example.com'
            };
            
            unifiedAuthManager.setAuthenticatedUser(mockUser, 'ui-test-token');
            
            // Wait for UI updates
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Check authenticated UI state
            const authSection = document.getElementById('authSection');
            const userSection = document.getElementById('userSection');
            const userGreeting = document.getElementById('userGreeting');
            
            const uiChecks = [];
            
            if (authSection) {
                uiChecks.push({
                    element: 'authSection',
                    expected: 'none',
                    actual: authSection.style.display,
                    passed: authSection.style.display === 'none'
                });
            }
            
            if (userSection) {
                uiChecks.push({
                    element: 'userSection',
                    expected: 'flex',
                    actual: userSection.style.display,
                    passed: userSection.style.display === 'flex'
                });
            }
            
            if (userGreeting) {
                const expectedGreeting = `Hello, ${mockUser.firstName}!`;
                uiChecks.push({
                    element: 'userGreeting',
                    expected: expectedGreeting,
                    actual: userGreeting.textContent,
                    passed: userGreeting.textContent === expectedGreeting
                });
            }
            
            // Test unauthenticated UI
            unifiedAuthManager.clearAuthentication();
            
            // Wait for UI updates
            await new Promise(resolve => setTimeout(resolve, 100));
            
            if (authSection) {
                uiChecks.push({
                    element: 'authSection (logout)',
                    expected: 'block',
                    actual: authSection.style.display,
                    passed: authSection.style.display === 'block'
                });
            }
            
            if (userSection) {
                uiChecks.push({
                    element: 'userSection (logout)',
                    expected: 'none',
                    actual: userSection.style.display,
                    passed: userSection.style.display === 'none'
                });
            }
            
            // Restore original UI state
            if (authSection && originalAuthSection) authSection.style.display = originalAuthSection;
            if (userSection && originalUserSection) userSection.style.display = originalUserSection;
            if (userGreeting && originalUserGreeting) userGreeting.textContent = originalUserGreeting;
            
            // Evaluate results
            const failedUIChecks = uiChecks.filter(check => !check.passed);
            
            if (failedUIChecks.length === 0) {
                this.addResult(testName, true, `UI properly updated: ${uiChecks.length} checks passed`);
            } else {
                this.addResult(testName, false, `UI update failures: ${failedUIChecks.length}/${uiChecks.length}`, failedUIChecks);
            }
            
        } catch (error) {
            this.addResult(testName, false, `Error during UI update test: ${error.message}`, error);
        }
    }

    /**
     * Test 5: Verify app reinitialization
     */
    async testAppReinitialization() {
        const testName = 'App Reinitialization';
        
        try {
            // Check if required functions are available
            const requiredFunctions = [
                { name: 'initializeApp', fn: window.initializeApp },
                { name: 'showMyFeedInMain', fn: window.showMyFeedInMain }
            ];
            
            const missingFunctions = requiredFunctions.filter(f => typeof f.fn !== 'function');
            
            if (missingFunctions.length > 0) {
                this.addResult(testName, false, `Missing functions: ${missingFunctions.map(f => f.name).join(', ')}`);
                return;
            }
            
            // Mock the functions to track calls
            let initializeAppCalled = false;
            let showMyFeedCalled = false;
            
            const originalInitializeApp = window.initializeApp;
            const originalShowMyFeedInMain = window.showMyFeedInMain;
            
            window.initializeApp = () => {
                initializeAppCalled = true;
                return originalInitializeApp();
            };
            
            window.showMyFeedInMain = () => {
                showMyFeedCalled = true;
                return originalShowMyFeedInMain();
            };
            
            // Trigger login which should cause reinitialization
            const mockUser = {
                id: 'test-reinit',
                username: 'reinittest',
                email: 'reinit@example.com'
            };
            
            unifiedAuthManager.setAuthenticatedUser(mockUser, 'reinit-token');
            
            // Wait for reinitialization to trigger
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Restore original functions
            window.initializeApp = originalInitializeApp;
            window.showMyFeedInMain = originalShowMyFeedInMain;
            
            // Clean up
            unifiedAuthManager.clearAuthentication();
            
            // Check results
            if (showMyFeedCalled) {
                this.addResult(testName, true, 'App reinitialization triggered successfully');
            } else {
                this.addResult(testName, false, 'App reinitialization not triggered', {
                    initializeAppCalled,
                    showMyFeedCalled
                });
            }
            
        } catch (error) {
            this.addResult(testName, false, `Error during reinitialization test: ${error.message}`, error);
        }
    }

    /**
     * Run all integration tests
     */
    async runAllTests() {
        console.log('🚀 Starting Unified Authentication Integration Tests...');
        console.log('=====================================');
        
        await this.setup();
        
        // Run all tests
        await this.testUnifiedManagerInitialization();
        await this.testStateSynchronization();
        await this.testEventDispatch();
        await this.testUIUpdates();
        await this.testAppReinitialization();
        
        await this.cleanup();
        
        // Summary
        console.log('=====================================');
        const passedTests = this.testResults.filter(r => r.passed).length;
        const totalTests = this.testResults.length;
        
        console.log(`🏁 Test Results: ${passedTests}/${totalTests} tests passed`);
        
        if (passedTests === totalTests) {
            console.log('🎉 ALL TESTS PASSED! Authentication synchronization is working perfectly.');
        } else {
            console.log('⚠️ Some tests failed. Check the results above for details.');
        }
        
        return {
            passed: passedTests,
            total: totalTests,
            results: this.testResults,
            success: passedTests === totalTests
        };
    }
}

/**
 * Run all tests (convenience function)
 */
export async function runAllTests() {
    const testSuite = new AuthIntegrationTest();
    return await testSuite.runAllTests();
}

/**
 * Quick verification function for browser console
 */
export function quickTest() {
    console.log('🔍 Quick Authentication System Check:');
    
    const checks = [
        { name: 'Unified Auth Manager', available: !!window.unifiedAuthManager },
        { name: 'API Client', available: !!window.apiClient },
        { name: 'User State', available: !!window.userState },
        { name: 'Login Function', available: typeof window.handleLogin === 'function' },
        { name: 'Logout Function', available: typeof window.logout === 'function' },
        { name: 'App Initializer', available: typeof window.initializeApp === 'function' },
        { name: 'Feed Function', available: typeof window.showMyFeedInMain === 'function' }
    ];
    
    checks.forEach(check => {
        const status = check.available ? '✅' : '❌';
        console.log(`${status} ${check.name}: ${check.available ? 'Available' : 'Missing'}`);
    });
    
    const allAvailable = checks.every(check => check.available);
    
    if (allAvailable) {
        console.log('🎉 All authentication components are properly loaded!');
    } else {
        console.log('⚠️ Some authentication components are missing.');
    }
    
    return allAvailable;
}

export default { runAllTests, quickTest };