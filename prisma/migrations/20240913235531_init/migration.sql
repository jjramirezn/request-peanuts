-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'CLAIMED', 'FAILED');

-- CreateTable
CREATE TABLE "Request" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "address" TEXT NOT NULL,
    "chain_id" TEXT NOT NULL,
    "token_address" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "url" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "tx_hash" TEXT,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);
