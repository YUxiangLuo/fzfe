import { test as base, expect } from "@playwright/test";
import {
  createStudentApiClient,
  loginStudentViaApi,
  type StudentApiClient,
} from "./support/backend";
import { StudentApp } from "./support/student-app";

type Fixtures = {
  studentApi: StudentApiClient;
  studentApp: StudentApp;
  studentToken: string;
};

export const test = base.extend<Fixtures>({
  studentToken: async ({}, use) => {
    const token = await loginStudentViaApi();
    await use(token);
  },

  studentApi: async ({ studentToken }, use) => {
    await use(createStudentApiClient(studentToken));
  },

  studentApp: async ({ page, studentToken }, use) => {
    await use(new StudentApp(page, studentToken));
  },
});

export { expect };
