import { Component, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";

@Component({
	selector: "app-footer",
	templateUrl: "./footer.component.html",
	styleUrl: "./footer.component.scss",

	imports: [CommonModule, RouterModule],
})
export class FooterComponent {
	_currentYear = signal<number>(new Date().getFullYear());
}
