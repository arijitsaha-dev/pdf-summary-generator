import type { HttpParams } from "@angular/common/http";
import { HttpClient } from "@angular/common/http";
import type { OnDestroy } from "@angular/core";
import { inject, Injectable } from "@angular/core";
import type { Observable} from "rxjs";
import { Subject } from "rxjs";
import { environment } from "src/environments/environment";

@Injectable({
	providedIn: "root",
})
export class HttpClientReqService implements OnDestroy {
	/**
	 * This service can be used to call APIs using following functions.
	 */
	_httpClient = inject(HttpClient);
	private _destroy$: Subject<boolean> = new Subject<boolean>();

	getRequest(url: any, queryParams?: HttpParams): Observable<any> {
		return this._httpClient.get(this.constructFullAPI(url), { params: queryParams });
	}

	postRequest(url: any, params?: any, queryParams?: HttpParams): Observable<any> {
		return this._httpClient.post(this.constructFullAPI(url), params, { params: queryParams });
	}

	putRequest(url: any, params?: any, queryParams?: HttpParams): Observable<any> {
		return this._httpClient.put(this.constructFullAPI(url), params, { params: queryParams });
	}

	patchRequest(url: any, params?: any, queryParams?: HttpParams): Observable<any> {
		return this._httpClient.patch(this.constructFullAPI(url), params, { params: queryParams });
	}

	deleteRequest(url: any, params?: any): Observable<any> {
		return this._httpClient.delete(this.constructFullAPI(url), params);
	}

	constructFullAPI(url: any): string {
		return environment["apiEndPoint"] + url;
	}

	// Unsubscribe from the subject itself
	ngOnDestroy(): void {
		this._destroy$.next(true);
		this._destroy$.complete();
	}
}
