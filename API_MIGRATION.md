# API Migration Guide

## Overview

- All endpoints now live under the `/api/v1` namespace. Add this prefix to every request path.
- Request and response payloads are unchanged unless noted.
- Authentication and authorization rules carry over.

## Sessions & Users

| Old Endpoint | New Endpoint | Notes |
| --- | --- | --- |
| `POST /api/auth/login` | `POST /api/v1/sessions` | Same body/response |
| `POST /api/assistants` | `POST /api/v1/assistants` |  |
| `GET /api/assistants` | `GET /api/v1/assistants` |  |
| `POST /api/users/teachers` | `POST /api/v1/users/teachers` |  |
| `POST /api/users/teachers/batch` | `POST /api/v1/users/teachers/batch` |  |
| `GET /api/teachers/:teacherId/assistants` | `GET /api/v1/teachers/:teacherId/assistants` |  |
| `/api/users[...]` | `/api/v1/users[...]` | Applies to all user-related routes (me, password, admin, etc.) |

## Classes

| Old Endpoint | New Endpoint |
| --- | --- |
| `POST /api/classes` | `POST /api/v1/classes` |
| `GET /api/classes` | `GET /api/v1/classes` |
| `GET /api/classes/:classId` | `GET /api/v1/classes/:classId` |
| `PUT /api/classes/:classId` | `PUT /api/v1/classes/:classId` |
| `DELETE /api/classes/:classId` | `DELETE /api/v1/classes/:classId` |
| `GET /api/teachers/:teacherId/classes` | `GET /api/v1/teachers/:teacherId/classes` |
| `GET /api/assistants/:assistantId/classes` | `GET /api/v1/assistants/:assistantId/classes` |

## Class Membership

| Old Endpoint | New Endpoint |
| --- | --- |
| `/api/classes/:classId/students[...]` | `/api/v1/classes/:classId/students[...]` |
| `/api/classes/:classId/assistants[...]` | `/api/v1/classes/:classId/assistants[...]` |

## Class Grading & Progress

| Old Endpoint | New Endpoint | Notes |
| --- | --- | --- |
| `GET /api/classes/:classId/reports` | `GET /api/v1/classes/:classId/reports` |  |
| `PUT /api/reports/:reportId` | `PUT /api/v1/reports/:reportId` |  |
| `GET /api/classes/:classId/experiment-status` | `GET /api/v1/classes/:classId/experiment-runs` |  |
| `GET /api/classes/:classId/grade-weights` | `GET /api/v1/classes/:classId/grading-policy` |  |
| `PUT /api/classes/:classId/grade-weights` | `PUT /api/v1/classes/:classId/grading-policy` |  |
| `GET /api/classes/:classId/latest-grades` | `GET /api/v1/classes/:classId/grade-summaries` |  |
| `GET /api/classes/:classId/step-events` | `GET /api/v1/classes/:classId/experiment-events` |  |

## Experiment Runs (Student Self-Service)

| Old Endpoint | New Endpoint | Notes |
| --- | --- | --- |
| `GET /api/experiment-status/me` | `GET /api/v1/students/me/experiment-runs/active` |  |
| `POST /api/experiment-status` | `POST /api/v1/students/me/experiment-runs` |  |
| `PUT /api/experiment-status/:experimentId` | `PUT /api/v1/experiment-runs/:experimentId` |  |
| `POST /api/experiments/events` | `POST /api/v1/experiment-runs/:experimentId/events` | `experimentId` now taken from path only |

## Experiment Reports

| Old Endpoint | New Endpoint | Notes |
| --- | --- | --- |
| `POST /api/reports` | `POST /api/v1/experiment-runs/:experimentId/report` | Body no longer includes `experiment_id` |

## Models & Predictions

| Old Endpoint | New Endpoint |
| --- | --- |
| `POST /api/model/ma/train` | `POST /api/v1/models/ma/training` |
| `POST /api/model/es/train` | `POST /api/v1/models/es/training` |
| `POST /api/model/arima/train` | `POST /api/v1/models/arima/training` |
| `POST /api/model/lstm/train` | `POST /api/v1/models/lstm/training` |
| `POST /api/model/weighted-average/train` | `POST /api/v1/models/weighted-average/training` |
| `POST /api/model/boosting/train` | `POST /api/v1/models/boosting/training` |
| `POST /api/model/stacking/train` | `POST /api/v1/models/stacking/training` |
| `POST /api/model/predict` | `POST /api/v1/models/predictions` |

## Datasets

| Old Endpoint | New Endpoint |
| --- | --- |
| `POST /api/datasets` | `POST /api/v1/datasets` |
| `GET /api/datasets` | `GET /api/v1/datasets` |
| `GET /api/datasets/industries` | `GET /api/v1/datasets/industries` |
| `GET /api/datasets/industries/:industry/companies` | `GET /api/v1/datasets/industries/:industry/companies` |
| `GET /api/datasets/industries/:industry/companies/:company/products` | `GET /api/v1/datasets/industries/:industry/companies/:company/products` |
| `GET /api/datasets/industries/:industry/companies/:company/products/:product/fields` | `GET /api/v1/datasets/industries/:industry/companies/:company/products/:product/fields` |
| `GET /api/datasets/industries/:industry/companies/:company/products/:product/sales` | `GET /api/v1/datasets/industries/:industry/companies/:company/products/:product/sales` |
| `/api/datasets/:datasetId` (GET/PUT/DELETE) | `/api/v1/datasets/:datasetId` |

## Experiment Manuals

| Old Endpoint | New Endpoint |
| --- | --- |
| `POST /api/manuals` | `POST /api/v1/manuals` |
| `GET /api/manuals` | `GET /api/v1/manuals` |
| `GET /api/manuals/active` | `GET /api/v1/manuals/active` |
| `PUT /api/manuals/:manualId` | `PUT /api/v1/manuals/:manualId` |
| `DELETE /api/manuals/:manualId` | `DELETE /api/v1/manuals/:manualId` |

## Question Bank

| Old Endpoint | New Endpoint |
| --- | --- |
| `GET /api/question-bank` | `GET /api/v1/question-bank/questions` |
| `POST /api/question-bank` | `POST /api/v1/question-bank/questions` |
| `PUT /api/question-bank/:questionId` | `PUT /api/v1/question-bank/questions/:questionId` |
| `DELETE /api/question-bank/:questionId` | `DELETE /api/v1/question-bank/questions/:questionId` |

## Quizzes

| Old Endpoint | New Endpoint |
| --- | --- |
| `GET /api/quiz/model-questions` | `GET /api/v1/quizzes/model/questions` |
| `GET /api/quiz/plan-questions` | `GET /api/v1/quizzes/plan/questions` |
| `POST /api/quiz/answers` | `POST /api/v1/quizzes/answers` |

## Tools

| Old Endpoint | New Endpoint |
| --- | --- |
| `POST /api/tools/adf` | `POST /api/v1/tools/adf` |

## Additional Notes

- Grade-weight creation endpoint was removed earlier; defaults now auto-create when a class is added.
- No schema changes accompany the rename. Only the report submission payload drops `experiment_id` from the JSON body (via path param).
- Update frontend code, API docs, tests, and any automation scripts to reference the new paths.
