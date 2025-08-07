import type { OnDestroy } from "@angular/core";
import { Component } from "@angular/core";
import { Subject } from "rxjs";

@Component({
	selector: "app-home",
	templateUrl: "./home.component.html",
	styleUrls: ["./home.component.scss"],
})
export class HomeComponent implements OnDestroy {
	private _destroy$: Subject<boolean> = new Subject<boolean>();

	ngOnDestroy(): void {
		this._destroy$.next(true);
		this._destroy$.unsubscribe();
	}
}
