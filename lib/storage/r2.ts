import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

function getR2Client(): S3Client {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Cloudflare R2 credentials are not configured')
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })
}

function getBucketName(): string {
  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME
  if (!bucket) throw new Error('CLOUDFLARE_R2_BUCKET_NAME env var is not set')
  return bucket
}

/**
 * Generates a signed URL for private R2 object access.
 * URL expires in 15 minutes.
 * Never expose r2_key or raw R2 URLs to the client.
 */
export async function generateSignedDownloadUrl(r2Key: string): Promise<string> {
  const client = getR2Client()
  const bucket = getBucketName()

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: r2Key,
  })

  return getSignedUrl(client, command, { expiresIn: 900 }) // 15 minutes
}

export async function uploadToR2(key: string, body: Buffer, contentType: string): Promise<void> {
  const client = getR2Client()
  const bucket = getBucketName()
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  }))
}
