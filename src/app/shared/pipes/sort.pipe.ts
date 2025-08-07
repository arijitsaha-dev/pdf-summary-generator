import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
	name: "sort",
})
export class SortPipe implements PipeTransform {
	// How to use in .html file ?
	// *ngFor="let item of array | sort: 'Order'"

	transform(array: any[], field: string): any[] {
		if (array !== undefined && array !== null && array.length !== 0 && Object.keys(array).length > 0) {
			array.sort((a: any, b: any) => {
				if (typeof a[field] === "string") {
					if (a[field].toLowerCase() < b[field].toLowerCase()) {
						return -1;
					}
					if (a[field].toLowerCase() > b[field].toLowerCase()) {
						return 1;
					}
					return 0;
				}
				if (a[field] < b[field]) {
					return -1;
				}
				if (a[field] > b[field]) {
					return 1;
				}
				return 0;
			});
			return array;
		}
		return array;
	}
}
