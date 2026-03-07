import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule } from '@angular/platform-browser/testing';
import { platformBrowserTesting } from '@angular/platform-browser/testing';

// First, initialize the Angular testing environment.
if (!getTestBed().platform) {
  getTestBed().initTestEnvironment(
    BrowserTestingModule,
    platformBrowserTesting(),
  );
}

