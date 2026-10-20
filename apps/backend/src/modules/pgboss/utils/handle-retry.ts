import { Observable, throwError, timer } from 'rxjs';
import { retry } from 'rxjs/operators';

export function handleRetry(retryAttempts = 9, retryDelay = 3000) {
	return <T>(source: Observable<T>) =>
		source.pipe(
			retry({
				count: retryAttempts,
				delay: (_error, retryIndex) => {
					if (retryIndex >= retryAttempts) {
						return throwError(() => _error);
					}
					return timer(retryDelay);
				},
			}),
		);
}
