import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { NgxSpinnerModule, NgxSpinnerService } from "ngx-spinner";
import { HeaderComponent } from "./base/header/header.component";
import { NotifyConnectionComponent } from "./base/notify-connection/notify-connection.component";
import { MainComponent } from "./base/main/main.component";
import { DataShareService } from "./services/global/data-share.service";

@Component({
	selector: "app-root",
	templateUrl: "./app.component.html",
	styleUrl: "./app.component.scss",
	imports: [
		CommonModule,
		HeaderComponent,
		// FooterComponent,
		RouterOutlet,
		NgxSpinnerModule,
		MainComponent,
		NotifyConnectionComponent,
	],
})
export class AppComponent {
	_spinner = inject(NgxSpinnerService);
	_dataShare = inject(DataShareService);
}
