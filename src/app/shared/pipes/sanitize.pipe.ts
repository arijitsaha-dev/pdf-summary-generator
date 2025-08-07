import type { PipeTransform } from "@angular/core";
import { inject, Pipe } from "@angular/core";
import type { SafeHtml, SafeResourceUrl, SafeScript, SafeStyle, SafeUrl } from "@angular/platform-browser";
import { DomSanitizer } from "@angular/platform-browser";

@Pipe({
	name: "sanitize",
})
export class SanitizePipe implements PipeTransform {
	// How to use in .html file ?
	// div [innerHtml]="htmlSnippet | sanitize: 'html'"></div>
	protected sanitizer = inject(DomSanitizer);

	transform(value: string, type: string): SafeHtml | SafeStyle | SafeScript | SafeUrl | SafeResourceUrl {
		switch (type) {
			case "html":
				return this.sanitizer.bypassSecurityTrustHtml(value);
			case "style":
				return this.sanitizer.bypassSecurityTrustStyle(value);
			case "script":
				return this.sanitizer.bypassSecurityTrustScript(value);
			case "url":
				return this.sanitizer.bypassSecurityTrustUrl(value);
			case "resourceUrl":
				return this.sanitizer.bypassSecurityTrustResourceUrl(value);
			default:
				throw new Error(`Invalid safe type specified: ${type}`);
		}
	}
}
