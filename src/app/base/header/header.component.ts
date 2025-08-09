import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { RouterModule } from "@angular/router";
import { LoggerService } from "src/app/services/global/logger.service";

@Component({
	selector: "app-header",
	templateUrl: "./header.component.html",
	styleUrl: "./header.component.scss",
	providers: [LoggerService],

	imports: [CommonModule, RouterModule],
})
export class HeaderComponent {
	private logger = inject(LoggerService);
	private readonly _serviceName = HeaderComponent.name;
}
