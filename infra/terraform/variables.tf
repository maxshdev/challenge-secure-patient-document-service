###############################################################################
# Variables — Secure Patient Document Service
###############################################################################

variable "project_name" {
  description = "Project name used as prefix for all resources"
  type        = string
  default     = "patient-docs"
}

variable "environment" {
  description = "Environment: development, staging, or production"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be development, staging, or production."
  }
}

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# ─── Database ──────────────────────────────────────────────────────────────────

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

# ─── ECS / Fargate ─────────────────────────────────────────────────────────────

variable "app_port" {
  description = "Port the application listens on"
  type        = number
  default     = 4000
}

variable "container_image" {
  description = "Docker image for the API (ECR URI)"
  type        = string
}

variable "ecs_cpu" {
  description = "Fargate task CPU units (1024 = 1 vCPU)"
  type        = number
  default     = 256
}

variable "ecs_memory" {
  description = "Fargate task memory in MB"
  type        = number
  default     = 512
}

variable "ecs_desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 2
}

variable "ecs_max_count" {
  description = "Maximum number of ECS tasks for auto-scaling"
  type        = number
  default     = 6
}

# ─── TLS / Certificate ────────────────────────────────────────────────────────

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for HTTPS on ALB"
  type        = string
}
