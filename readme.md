📐 Architecture Overview

```
User → ALB DNS → AWS ALB → ALB Ingress Controller
     → Kubernetes Ingress
          ├── /           → Frontend (Next.js)
          ├── /api/auth   → Auth Service (Node.js)
          ├── /api/payment → Payment Service (Node.js)
          └── /api/notify → Notification Service (Node.js)
                               ↓
                         RDS PostgreSQL (Private Subnet)
```

---

## 🧩 Services

| Service | Port | Tech | Description |
|---|---|---|---|
| **Frontend** | 3000 | Next.js 14 + Tailwind | Dashboard UI — login, payments, notifications |
| **Auth Service** | 3001 | Node.js + Express + JWT | Register, login, token verify |
| **Payment Service** | 3002 | Node.js + Express | Process payments, call notification service |
| **Notification Service** | 3003 | Node.js + Express | Store & serve notifications |
| **PostgreSQL** | 5432 | Postgres 15 | Separate DB per service |

---

## 🚀 Run Locally (Docker Compose)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Docker Compose v2+

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/eks-micropay.git
cd eks-micropay/microservices-app
```

### 2. Start all services

```bash
docker compose up --build
```

> First run takes ~2-3 mins to build images. Subsequent runs are instant.

### 3. Open the app

| URL | What |
|---|---|
| http://localhost:3000/login | 👈 Start here — Register & Login |
| http://localhost:3000 | Dashboard |
| http://localhost:3001/health | Auth Service health |
| http://localhost:3002/health | Payment Service health |
| http://localhost:3003/health | Notification Service health |

### 4. Stop

```bash
docker compose down          # stop containers
docker compose down -v       # stop + wipe database
```

---

## 🧪 Test APIs with curl

### Register
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"test123"}'
```

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Save the token
export TOKEN="paste_token_here"
```

### Create Payment
```bash
curl -X POST http://localhost:3002/api/payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"amount":99.99,"currency":"USD","description":"Test payment"}'
```

### My Payments
```bash
curl http://localhost:3002/api/payment/my \
  -H "Authorization: Bearer $TOKEN"
```

### My Notifications
```bash
curl http://localhost:3003/api/notification
```

---

## 📁 Project Structure

```
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
```

---

## 🔄 Service Communication

```
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
```

---

## 🔐 API Reference

### Auth Service — `http://localhost:3001`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | ❌ | Register new user |
| POST | `/api/auth/login` | ❌ | Login, returns JWT |
| GET | `/api/auth/me` | ✅ | Get current user |
| POST | `/api/auth/verify` | ✅ | Verify JWT token |
| GET | `/health` | ❌ | Health check |

### Payment Service — `http://localhost:3002`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/payment` | ✅ | Create payment |
| GET | `/api/payment/my` | ✅ | My payments |
| GET | `/api/payment` | ✅ | All payments |
| GET | `/health` | ❌ | Health check |

### Notification Service — `http://localhost:3003`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/notification/send` | ❌ | Send notification (internal) |
| GET | `/api/notification/user/:id` | ❌ | User notifications |
| GET | `/api/notification` | ❌ | All notifications |
| GET | `/health` | ❌ | Health check |

---

## 🗄️ Database Schema

### authdb — `users`
```sql
id          UUID PRIMARY KEY
name        VARCHAR(100)
email       VARCHAR(255) UNIQUE
password    VARCHAR(255)        -- bcrypt hashed
role        VARCHAR(20)         -- 'user' | 'admin'
created_at  TIMESTAMP
```

### paymentdb — `payments`
```sql
id              UUID PRIMARY KEY
user_id         UUID
amount          DECIMAL(10,2)
currency        VARCHAR(10)
status          VARCHAR(20)     -- 'completed' | 'failed'
description     TEXT
transaction_id  VARCHAR(255)
created_at      TIMESTAMP
```

### notificationdb — `notifications`
```sql
id          UUID PRIMARY KEY
user_id     UUID
type        VARCHAR(50)         -- 'payment' | 'general'
subject     VARCHAR(255)
message     TEXT
email       VARCHAR(255)
status      VARCHAR(20)
created_at  TIMESTAMP
```

---

## 🏗️ Infrastructure (Coming Next)

### Phase 2 — Terraform + AWS EKS

```
terraform/
├── modules/
│   ├── vpc/        # VPC, public/private subnets, NAT Gateway
│   ├── eks/        # EKS cluster + managed node groups
│   ├── rds/        # PostgreSQL RDS Multi-AZ
│   └── iam/        # IAM roles, IRSA policies
└── environments/
    ├── dev/
    └── prod/
```

### Phase 3 — Kubernetes Manifests

- Namespaces per service
- Deployments with resource limits
- Services (ClusterIP)
- ALB Ingress with annotations
- HorizontalPodAutoscaler (CPU + memory)
- PersistentVolumeClaims (EBS gp3)
- ConfigMaps + Secrets (External Secrets Operator)

### AWS Services Used
| Service | Purpose |
|---|---|
| EKS | Kubernetes control plane |
| VPC | Network isolation |
| ALB | Load balancing + SSL termination |
| RDS PostgreSQL | Managed database (private subnet) |
| EBS | Persistent storage for pods |
| S3 | Backups and logs |
| IAM + IRSA | Fine-grained pod permissions |
| ECR | Docker image registry |

---

## 🛡️ Security Highlights

- JWT tokens with 7-day expiry
- Passwords hashed with bcrypt (12 rounds)
- Each service has its own isolated database
- Service-to-service auth via token verification
- Docker network isolation (`microservices-net`)
- In EKS: private subnets, IRSA, NetworkPolicies, Pod Security Standards

---

## 🤝 Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feature/my-feature`
3. Commit: `git commit -m 'Add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — feel free to use this for learning and projects.

---

<div align="center">
Built for learning AWS EKS, Terraform, and Kubernetes • Star ⭐ if helpful!
</div>
