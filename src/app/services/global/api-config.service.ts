import { Injectable } from "@angular/core";

@Injectable({
	providedIn: "root",
})
export class ApiConfigService {
	/**
	 * This service is used to list all the APIs
	 * dedicated to this application.
	 */

	API = {
		totalCases: "/total.json",
		stateData: "/state_data.json",
	};
}
