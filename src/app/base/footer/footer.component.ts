import { Component, signal } from "@angular/core";

@Component({
	selector: "app-footer",
	templateUrl: "./footer.component.html",
	styleUrl: "./footer.component.scss",
})
export class FooterComponent {
	_currentYear = signal<number>(new Date().getFullYear());
}
