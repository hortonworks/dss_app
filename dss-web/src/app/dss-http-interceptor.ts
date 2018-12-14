import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import {Injectable, isDevMode} from '@angular/core';
import { Observable } from 'rxjs/Rx';
import { AuthUtils } from './shared/utils/auth-utils';
import { HEADER_CHALLENGE_HREF } from './shared/utils/httpUtil';
import { HttpUtil } from './shared/utils/httpUtil';

@Injectable()
export class DssHttpInterceptor implements HttpInterceptor {

  private readonly headers = {
    setHeaders: {
      'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }
  };

  setHeaders(req: HttpRequest<any>) {
    if(req.headers.get('Content-Type-Value') === 'undefined'){
      return {
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
        'X-Requested-With': 'XMLHttpRequest'
      }
    }else {
      return {
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    }
  }
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let headers = {
      setHeaders: this.setHeaders(req),
      url : ((req.url.startsWith('auth/')) ? req.url.replace(/^auth\//, "/auth/") : req.url.replace(/^\//,''))
    };

    const reqClone = req.clone(headers);
    return next.handle(reqClone)
      .catch(err => {
        this.handleAuthError(err)
        if(err.error && req.headers.get('httpUtilErrorHandler') !== 'inService') {
          HttpUtil.httpErrResponseHandler(err);
        }
        return Observable.throwError(err);
      });
  }
  private handleAuthError(httpErrResponse: HttpErrorResponse) {
    if (httpErrResponse.status === 401) {
      return this.redirectToLogin(httpErrResponse);
    }
    if (httpErrResponse.status === 403) {
      return this.setUserAsInvalid(httpErrResponse);
    }
  }
  private setUserAsInvalid(httpErrResponse: HttpErrorResponse) {
    AuthUtils.setValidUser(false);
    return Observable.throwError(httpErrResponse);
  }
  private redirectToLogin(httpErrResponse: HttpErrorResponse) {
    const challengeAt = httpErrResponse.headers.get(HEADER_CHALLENGE_HREF);
    const redirectTo = `${window.location.protocol}//${window.location.host}/${challengeAt}`;
    if (window.location.href.startsWith(`${window.location.protocol}//${window.location.host}/sign-in`) === false) {
      window.location.href = `${redirectTo}?originalUrl=${window.location.href}`;
    }
    return Observable.throwError(httpErrResponse);
  }
}
