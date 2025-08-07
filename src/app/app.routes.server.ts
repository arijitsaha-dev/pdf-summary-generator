import type { ServerRoute } from "@angular/ssr";
import { RenderMode } from "@angular/ssr";

export const serverRoutes: ServerRoute[] = [
	{
		path: "dashboard",
		renderMode: RenderMode.Client,
	},
	{
		path: "**",
		renderMode: RenderMode.Prerender,
	},
];
