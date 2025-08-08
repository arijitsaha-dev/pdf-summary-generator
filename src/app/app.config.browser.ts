import type { ApplicationConfig } from "@angular/core";
import { mergeApplicationConfig } from "@angular/core";
import { appConfig } from "./app.config";
import { provideClientHydration, withEventReplay } from "@angular/platform-browser";

const browserConfig: ApplicationConfig = {
	providers: [
		provideClientHydration(withEventReplay()),
	],
};

export const config = mergeApplicationConfig(appConfig, browserConfig);
