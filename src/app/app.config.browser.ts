import type { ApplicationConfig } from "@angular/core";
import { mergeApplicationConfig } from "@angular/core";
import { provideClientHydration, withEventReplay } from "@angular/platform-browser";
import { appConfig } from "./app.config";

const browserConfig: ApplicationConfig = {
	providers: [provideClientHydration(withEventReplay())],
};

export const config = mergeApplicationConfig(appConfig, browserConfig);
