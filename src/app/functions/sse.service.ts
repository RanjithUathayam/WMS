import { Injectable, NgZone } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class SseService {
    constructor(private ngZone: NgZone) {}

    getServerSentEvent(url: string): Observable<any> {
        return new Observable<any>(observer => {
            const eventSource = new EventSource(url);

            eventSource.onmessage = event => {
                this.ngZone.run(() => {
                    observer.next(JSON.parse(event.data));
                });
            };

            eventSource.onerror = error => {
                this.ngZone.run(() => {
                    observer.error(error);
                    eventSource.close();
                });
            };

            eventSource.onopen = () => { 
            };

            const closeConnection = () => {
                eventSource.close();
                this.ngZone.run(() => {
                    observer.complete(); 
                });
            };

            // Listen for the window unload event to close the EventSource connection.
            window.addEventListener('beforeunload', closeConnection);

            return () => {
                window.removeEventListener('beforeunload', closeConnection);
                closeConnection();
            };
        });
    }

    getServerSentEventwithParams(url: string, params?: Record<string, string>): Observable<any> {
        // Add query parameters to the URL if provided
        if (params) {
            const queryString = new URLSearchParams(params).toString();
            url = `${url}?${queryString}`;
        }

        return new Observable<any>(observer => {
            const eventSource = new EventSource(url);

            eventSource.onmessage = event => {
                this.ngZone.run(() => {
                    observer.next(JSON.parse(event.data));
                });
            };

            eventSource.onerror = error => {
                this.ngZone.run(() => {
                    observer.error(error);
                    eventSource.close();
                });
            };

            const closeConnection = () => {
                eventSource.close();
                this.ngZone.run(() => {
                    observer.complete();
                });
            };

            // Clean up on window unload or observable unsubscribe
            window.addEventListener('beforeunload', closeConnection);

            return () => {
                window.removeEventListener('beforeunload', closeConnection);
                closeConnection();
            };
        });
    }
}