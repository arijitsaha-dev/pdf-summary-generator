import { CommonModule } from "@angular/common";
import { Component, inject, ViewChild } from "@angular/core";
import { RouterLink } from "@angular/router";
import { SanitizePipe } from "../../shared/pipes/sanitize.pipe";
import type { AfterViewChecked, AfterViewInit} from "@angular/core";
import type { ElementRef } from "@angular/core";
import { LoggerService } from "src/app/services/global/logger.service";
@Component({
	selector: "app-header",
	templateUrl: "./header.component.html",
	styleUrl: "./header.component.scss",
	providers: [LoggerService],

})
export class HeaderComponent {
	private logger = inject(LoggerService);
	private readonly _serviceName = HeaderComponent.name;
}
