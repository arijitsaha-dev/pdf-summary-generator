import { CommonModule } from "@angular/common";
import { Component, inject, signal } from "@angular/core";
import { DataShareService } from "../../services/global/data-share.service";
@Component({
	selector: "app-main",
	templateUrl: "./main.component.html",
	styleUrl: "./main.component.scss",
	imports: [CommonModule],
})
export class MainComponent {
	_dataShare = inject(DataShareService);
	_isSidebarExpanded = signal<boolean>(false);
}
