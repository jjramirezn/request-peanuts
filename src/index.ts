import HyperExpress from 'hyper-express';
import peanut from '@squirrel-labs/peanut-sdk'
import short from 'short-uuid';
import { Request, RequestStatus, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const translator = short();

const webserver = new HyperExpress.Server();

type PayBody = {
  requestId: string;
  url: string;
};

type RequestBody = {
  address: string;
  chainId: string;
  tokenAddress: string;
  amount: string;
}

const WEB_BASE_URL = process.env['WEB_BASE_URL'] || 'http://localhost:3000';
const PEANUT_API_KEY = process.env['PEANUT_API_KEY'] || '';

/**
 * Validates the pay body
 * @param body The pay body
 * @returns The validated pay body
 * @throws Error if the pay body is invalid
 */
function validatePayBody(body: unknown): PayBody {
  if  (typeof body !== 'object' || body === null) {
    throw new Error('Invalid body, must be an object');
  }
  if  (!('requestId' in body) || !('url' in body)) {
    throw new Error('Invalid body, must contain requestId and url');
  }
  if  (typeof body.requestId !== 'string' || typeof body.url !== 'string') {
    throw new Error('Invalid body, requestId and url must be strings');
  }
  return body as PayBody;
}

/**
 * Validates the request body
 * @param body The request body
 * @returns The validated request body
 * @throws Error if the request body is invalid
 */
function validateRequestBody(body: unknown): RequestBody {
  if  (typeof body !== 'object' || body === null) {
    throw new Error('Invalid body, must be an object');
  }
  if  (!('address' in body) || !('chainId' in body) || !('tokenAddress' in body) || !('amount' in body)) {
    throw new Error('Invalid body, must contain address, chainId, tokenAddress and amount');
  }
  if  (typeof body.address !== 'string' || typeof body.chainId !== 'string' || typeof body.tokenAddress !== 'string' || typeof body.amount !== 'string') {
    throw new Error('Invalid body, address, chainId, tokenAddress and amount must be strings');
  }
  return body as RequestBody;
}

/**
 * Builds the link for the given request
 * @param request The request
 * @returns The link
 */
function buildLink(request: Request) {
  return `${WEB_BASE_URL}/pay?i=${translator.fromUUID(request.id)}&c=${request.chainId}&amt=${request.amount}&tId=${request.tokenAddress}`;
}

/**
 * Creates a new payment request and returns the link
 * @param req express request
 * @param res express response
 */
webserver.post('/request', async (req, res) => {
  let requestBody: RequestBody;
  try {
    requestBody = validateRequestBody(await req.json());
  } catch (err: unknown) {
    res.status(400).json({error: (err as Error).message});
    return;
 }

 const request = await prisma.request.create({ data: requestBody });

  res.status(201).json({link: buildLink(request)});
});

/**
 * Claims a link to the address of the given request
 * @param req express request
 * @param res express response
 */
webserver.post('/pay', async (req, res) => {
  let payBody: PayBody;
  try {
    payBody = validatePayBody(await req.json());
  } catch (err: unknown) {
    res.status(400).json({error: (err as Error).message});
    return;
 }

  const request = await prisma.request.findUnique({
    where: {
      id: translator.toUUID(payBody.requestId)
    }
  });

  if (!request) {
    res.status(404).json({error: 'Request not found'});
    return;
  }

  const linkDetails = await peanut.getLinkDetails({link: payBody.url});

  if (linkDetails.chainId !== request.chainId) {
    res.status(400).json({error: `Requested chain ${request.chainId} does not match link chain ${linkDetails.chainId}`});
    return;
  }

  if (linkDetails.tokenAddress !== request.tokenAddress) {
    res.status(400).json({error: `Requested token ${request.tokenAddress} does not match link token ${linkDetails.tokenAddress}`});
    return;
  }

  if (String(linkDetails.tokenAmount) !== request.amount) {
    res.status(400).json({error: `Requested amount ${request.amount} does not match link amount ${linkDetails.tokenAmount}`});
    return;
  }

  const claimedLinkResponse = await peanut.claimLinkGasless({
    APIKey: PEANUT_API_KEY,
    link: payBody.url,
    recipientAddress: request.address,
  });

  await prisma.request.update({
    where: { id: translator.toUUID(payBody.requestId) },
    data: { status: RequestStatus.CLAIMED },
  });

  res.status(200).json({txHash: claimedLinkResponse.txHash});
});

webserver.listen(3000).then((_socket) => {
  console.log(`Server listening on port 3000`);
}).catch((err) => {
  console.error(err);
});
