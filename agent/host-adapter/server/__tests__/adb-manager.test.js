const { exec } = require('child_process');
const adbManager = require('../adb-manager');

// Mock the entire child_process module
jest.mock('child_process');

describe('adb-manager', () => {
    afterEach(() => {
        // Clear all mocks after each test
        jest.clearAllMocks();
    });

    describe('setupPortForwarding', () => {
        it('should execute the correct adb forward command', async () => {
            exec.mockImplementation((command, callback) => {
                callback(null, 'success', '');
            });

            await adbManager.setupPortForwarding('emulator-5554', 8081, 8080);

            expect(exec).toHaveBeenCalledWith(
                'adb -s emulator-5554 forward tcp:8081 tcp:8080',
                expect.any(Function)
            );
        });
    });

    describe('startAgentApp', () => {
        it('should execute the correct adb shell am start-service command', async () => {
            exec.mockImplementation((command, callback) => {
                callback(null, 'success', '');
            });

            await adbManager.startAgentApp('emulator-5554');

            expect(exec).toHaveBeenCalledWith(
                'adb -s emulator-5554 shell am start-service com.example.controlplane/.AgentService',
                expect.any(Function)
            );
        });
    });

    describe('findNewEmulatorDevice', () => {
        it("should parse 'adb devices' output and return the correct serial", async () => {
            const adbOutput = 'List of devices attached\nemulator-5554\tdevice\n192.168.1.10:5555\tdevice';
            exec.mockImplementation((command, callback) => {
                callback(null, adbOutput, '');
            });

            const serial = await adbManager.findNewEmulatorDevice();

            expect(exec).toHaveBeenCalledWith('adb devices', expect.any(Function));
            expect(serial).toBe('emulator-5554');
        });

        it('should return the first emulator when multiple are present', async () => {
            const adbOutput = 'List of devices attached\nemulator-5556\tdevice\nemulator-5554\tdevice';
            exec.mockImplementation((command, callback) => {
                callback(null, adbOutput, '');
            });

            const serial = await adbManager.findNewEmulatorDevice();

            expect(exec).toHaveBeenCalledWith('adb devices', expect.any(Function));
            expect(serial).toBe('emulator-5556');
        });

        it('should throw an error if no emulator device is found', async () => {
            const adbOutput = 'List of devices attached';
            exec.mockImplementation((command, callback) => {
                callback(null, adbOutput, '');
            });

            await expect(adbManager.findNewEmulatorDevice()).rejects.toThrow('No running emulator device found.');
        });
    });

    describe('waitForBoot', () => {
        it('should resolve when boot is completed', async () => {
            let callCount = 0;
            exec.mockImplementation((command, callback) => {
                callCount++;
                // Simulate boot completing on the 3rd call
                const output = (callCount < 3) ? '0' : '1';
                callback(null, output, '');
            });

            // Set a very short timeout for the test
            jest.spyOn(global, 'setTimeout').mockImplementation(cb => cb());

            await adbManager.waitForBoot('emulator-5554', 5000);

            expect(exec).toHaveBeenCalledWith('adb -s emulator-5554 shell getprop sys.boot_completed', expect.any(Function));
            expect(callCount).toBe(3);
        });

        it('should continue polling if adb command fails', async () => {
            let callCount = 0;
            exec.mockImplementation((command, callback) => {
                callCount++;
                if (callCount < 2) {
                    // Simulate adb command failing initially
                    callback(new Error('device offline'), '', 'error');
                } else {
                    // Simulate boot completing on the 2nd successful call
                    callback(null, '1', '');
                }
            });

            jest.spyOn(global, 'setTimeout').mockImplementation(cb => cb());

            await adbManager.waitForBoot('emulator-5554', 5000);

            expect(exec).toHaveBeenCalledWith('adb -s emulator-5554 shell getprop sys.boot_completed', expect.any(Function));
            expect(callCount).toBe(2);
        });

        it('should time out if boot never completes', async () => {
            exec.mockImplementation((command, callback) => {
                callback(null, '0', ''); // Always return '0'
            });

            jest.spyOn(global, 'setTimeout').mockImplementation(cb => cb());

            await expect(adbManager.waitForBoot('emulator-5554', 10)).rejects.toThrow('Timeout waiting for device emulator-5554 to boot.');
        });
    });
});
