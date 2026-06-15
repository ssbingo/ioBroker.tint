// This file extends the AdapterConfig type from "@types/iobroker"

// Inhere the actual properties of your adapter config
declare global {
	namespace ioBroker {
		interface AdapterConfig {
			ip: string;
			port: number;
			wsPort: number;
			apiKey: string;
			pollingInterval: number;
			autoApplyColorWheel: boolean;
			transitionTime: number;
			watchdogMinutes: number;
		}
	}
}

// this is required so the above global namespace changes take effect
export {};
