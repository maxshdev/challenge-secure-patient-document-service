# Secure Patient Document Service — Terraform Infrastructure

Infrastructure as Code (IaC) for deploying the Secure Patient Document Service
on AWS using ECS Fargate, RDS PostgreSQL, and S3.

## Architecture

```
Internet → ALB (HTTPS/TLS) → ECS Fargate Tasks → RDS PostgreSQL
                                                → S3 (SSE-KMS, private)
```

## Prerequisites

- AWS CLI configured with appropriate credentials
- Terraform >= 1.5
- Docker (for building and pushing container images)

## Usage

```bash
cd infra/terraform

# Initialize Terraform
terraform init

# Preview changes
terraform plan -var-file="environments/production.tfvars"

# Apply
terraform apply -var-file="environments/production.tfvars"

# Destroy
terraform destroy -var-file="environments/production.tfvars"
```

## Modules

| Module | Purpose |
|--------|---------|
| `networking` | VPC, subnets, security groups |
| `database` | RDS PostgreSQL with encryption |
| `storage` | S3 bucket with SSE-KMS + Block Public Access |
| `compute` | ECS cluster, Fargate service, task definition |
| `security` | KMS keys, IAM roles, Secrets Manager |
| `monitoring` | CloudWatch logs, CloudTrail, alarms |

## Security Features

- All resources in private subnets (except ALB)
- RDS encryption at rest with KMS
- S3 SSE-KMS + Block Public Access
- IAM task-level roles with least privilege
- Secrets Manager for database credentials
- CloudTrail for API audit logging
- No wildcard IAM permissions
