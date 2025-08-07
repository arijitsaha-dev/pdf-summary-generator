import type { Routes } from "@angular/router";

export const routes: Routes = [
	{
		path: "home",
		title: "PDF Summary Generator - Upload",
		loadComponent: () => import("./pages/home/home.component").then((m) => m.HomeComponent),
	},
	{
		path: "summary",
		title: "PDF Summary Generator - Summary",
		loadComponent: () => import("./pages/summary/summary.component").then((m) => m.SummaryComponent),
	},
	{
		path: "",
		redirectTo: "home",
		pathMatch: "full",
	},
	{
		path: "**",
		redirectTo: "home",
		pathMatch: "full",
	},
];
