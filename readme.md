📐 Architecture Overview
User → ALB DNS → AWS ALB → ALB Ingress Controller
     → Kubernetes Ingress
          ├── /           → Frontend (Next.js)
          ├── /api/auth   → Auth Service (Node.js)
          ├── /api/payment → Payment Service (Node.js)
          └── /api/notify → Notification Service (Node.js)
                               ↓
                         RDS PostgreSQL (Private Subnet)

🧩 Services
ServicePortTechDescriptionFrontend3000Next.js 14 + TailwindDashboard UI — login, payments, notificationsAuth Service3001Node.js + Express + JWTRegister, login, token verifyPayment Service3002Node.js + ExpressProcess payments, call notification serviceNotification Service3003Node.js + ExpressStore & serve notificationsPostgreSQL5432Postgres 15Separate DB per service

🚀 Run Locally (Docker Compose)
Prerequisites

Docker Desktop installed and running
Docker Compose v2+

1. Clone the repo
bashgit clone https://github.com/YOUR_USERNAME/eks-micropay.git
cd eks-micropay/microservices-app
2. Start all services
bashdocker compose up --build

First run takes ~2-3 mins to build images. Subsequent runs are instant.

3. Open the app
URLWhathttp://localhost:3000/login👈 Start here — Register & Loginhttp://localhost:3000Dashboardhttp://localhost:3001/healthAuth Service healthhttp://localhost:3002/healthPayment Service healthhttp://localhost:3003/healthNotification Service health
4. Stop
bashdocker compose down          # stop containers
docker compose down -v       # stop + wipe database

🧪 Test APIs with curl
Register
bashcurl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"test123"}'
Login
bashcurl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Save the token
export TOKEN="paste_token_here"
Create Payment
bashcurl -X POST http://localhost:3002/api/payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"amount":99.99,"currency":"USD","description":"Test payment"}'
My Payments
bashcurl http://localhost:3002/api/payment/my \
  -H "Authorization: Bearer $TOKEN"
My Notifications
bashcurl http://localhost:3003/api/notification

📁 Project Structure
eks-micropay/
├── microservices-app/              # Local Docker Compose app
│   ├── docker-compose.yml
│   ├── scripts/
│   │   └── init-db.sh             # Creates authdb, paymentdb, notificationdb
│   ├── frontend/                  # Next.js 14
│   │   ├── pages/
│   │   │   ├── _app.js
│   │   │   ├── index.js           # Dashboard
│   │   │   └── login.js           # Login/Register
│   │   ├── lib/api.js             # Axios API helpers
│   │   ├── styles/globals.css
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── auth-service/              # JWT Authentication
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   ├── db.js
│   │   │   ├── middleware/auth.js
│   │   │   └── routes/auth.js
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── payment-service/           # Payment Processing
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   ├── db.js
│   │   │   └── routes/payment.js
│   │   ├── Dockerfile
│   │   └── package.json
│   └── notification-service/      # Notifications
│       ├── src/
│       │   ├── index.js
│       │   ├── db.js
│       │   └── routes/notification.js
│       ├── Dockerfile
│       └── package.json
│
└── kubernetes/                    # K8s manifests (coming soon)
    ├── namespaces/
    ├── frontend/
    ├── auth-service/
    ├── payment-service/
    ├── notification-service/
    ├── ingress/
    └── storage/

🔄 Service Communication
Frontend (3000)
  │
  ├── POST /api/auth/login      → Auth Service (3001)  → PostgreSQL authdb
  ├── POST /api/auth/register   → Auth Service (3001)  → PostgreSQL authdb
  │
  ├── POST /api/payment         → Payment Service (3002)
  │                                  ├── Verify token → Auth Service (3001)
  │                                  ├── Save payment → PostgreSQL paymentdb
  │                                  └── Notify       → Notification Service (3003)
  │                                                         └── Save → PostgreSQL notificationdb
  │
  └── GET  /api/notification    → Notification Service (3003) → PostgreSQL notificationdb

🔐 API Reference
Auth Service — http://localhost:3001
MethodEndpointAuthDescriptionPOST/api/auth/register❌Register new userPOST/api/auth/login❌Login, returns JWTGET/api/auth/me✅Get current userPOST/api/auth/verify✅Verify JWT tokenGET/health❌Health check
Payment Service — http://localhost:3002
MethodEndpointAuthDescriptionPOST/api/payment✅Create paymentGET/api/payment/my✅My paymentsGET/api/payment✅All paymentsGET/health❌Health check
Notification Service — http://localhost:3003
MethodEndpointAuthDescriptionPOST/api/notification/send❌Send notification (internal)GET/api/notification/user/:id❌User notificationsGET/api/notification❌All notificationsGET/health❌Health check

🗄️ Database Schema
authdb — users
sqlid          UUID PRIMARY KEY
name        VARCHAR(100)
email       VARCHAR(255) UNIQUE
password    VARCHAR(255)        -- bcrypt hashed
role        VARCHAR(20)         -- 'user' | 'admin'
created_at  TIMESTAMP
paymentdb — payments
sqlid              UUID PRIMARY KEY
user_id         UUID
amount          DECIMAL(10,2)
currency        VARCHAR(10)
status          VARCHAR(20)     -- 'completed' | 'failed'
description     TEXT
transaction_id  VARCHAR(255)
created_at      TIMESTAMP
notificationdb — notifications
sqlid          UUID PRIMARY KEY
user_id     UUID
type        VARCHAR(50)         -- 'payment' | 'general'
subject     VARCHAR(255)
message     TEXT
email       VARCHAR(255)
status      VARCHAR(20)
created_at  TIMESTAMP

🏗️ Infrastructure (Coming Next)
Phase 2 — Terraform + AWS EKS
terraform/
├── modules/
│   ├── vpc/        # VPC, public/private subnets, NAT Gateway
│   ├── eks/        # EKS cluster + managed node groups
│   ├── rds/        # PostgreSQL RDS Multi-AZ
│   └── iam/        # IAM roles, IRSA policies
└── environments/
    ├── dev/
    └── prod/
Phase 3 — Kubernetes Manifests

Namespaces per service
Deployments with resource limits
Services (ClusterIP)
ALB Ingress with annotations
HorizontalPodAutoscaler (CPU + memory)
PersistentVolumeClaims (EBS gp3)
ConfigMaps + Secrets (External Secrets Operator)

AWS Services Used
ServicePurposeEKSKubernetes control planeVPCNetwork isolationALBLoad balancing + SSL terminationRDS PostgreSQLManaged database (private subnet)EBSPersistent storage for podsS3Backups and logsIAM + IRSAFine-grained pod permissionsECRDocker image registry

🛡️ Security Highlights

JWT tokens with 7-day expiry
Passwords hashed with bcrypt (12 rounds)
Each service has its own isolated database
Service-to-service auth via token verification
Docker network isolation (microservices-net)
In EKS: private subnets, IRSA, NetworkPolicies, Pod Security Standards


🤝 Contributing

Fork the repo
Create a branch: git checkout -b feature/my-feature
Commit: git commit -m 'Add my feature'
Push: git push origin feature/my-feature
Open a Pull Request


📄 License
MIT License — feel free to use this for learning and projects
