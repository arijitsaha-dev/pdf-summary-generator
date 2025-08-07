import type { Routes } from "@angular/router";

export const routes: Routes = [
	{
		path: "dashboard",
		loadComponent: () => import("./pages/dashboard/home/home.component").then((m) => m.HomeComponent),
	},
	{
		path: "",
		redirectTo: "dashboard",
		pathMatch: "full",
	},
	{
		path: "**",
		redirectTo: "dashboard",
		pathMatch: "full",
	},
];
