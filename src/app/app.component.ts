import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { NgxSpinnerModule, NgxSpinnerService } from "ngx-spinner";
import { DataShareService } from "./services/global/data-share.service";
import { HeaderComponent } from "./base/header/header.component";
import { MainComponent } from "./base/main/main.component";
import { NotifyConnectionComponent } from "./base/notify-connection/notify-connection.component";
import { FooterComponent } from "./base/footer/footer.component";
import { RouterModule } from "@angular/router";

@Component({
	selector: "app-root",

	imports: [
		HeaderComponent,
		MainComponent,
		NotifyConnectionComponent,
		FooterComponent,
		CommonModule,
		RouterOutlet,
		NgxSpinnerModule,
		RouterModule,
	],
	templateUrl: "./app.component.html",
	styleUrl: "./app.component.scss",
})
export class AppComponent {
	_spinner = inject(NgxSpinnerService);
	_dataShare = inject(DataShareService);
}
