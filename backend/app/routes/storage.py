"""
Camada de storage. Usa boto3 contra qualquer endpoint S3-compatible
(Cloudflare R2, AWS S3, DigitalOcean Spaces, Backblaze B2).
"""
import boto3
from botocore.client import Config

from app.config import settings


def get_s3_client():
    addressing_style = "path" if settings.S3_FORCE_PATH_STYLE else "auto"
    kwargs = {
        "aws_access_key_id": settings.S3_ACCESS_KEY_ID,
        "aws_secret_access_key": settings.S3_SECRET_ACCESS_KEY,
        "config": Config(signature_version="s3v4", s3={"addressing_style": addressing_style}),
    }
    if settings.S3_ENDPOINT_URL:
        kwargs["endpoint_url"] = settings.S3_ENDPOINT_URL
    if settings.S3_REGION and settings.S3_REGION != "auto":
        kwargs["region_name"] = settings.S3_REGION
    return boto3.client("s3", **kwargs)


def upload_fileobj(fileobj, key: str, content_type: str = "application/octet-stream"):
    client = get_s3_client()
    client.upload_fileobj(
        fileobj,
        settings.S3_BUCKET_NAME,
        key,
        ExtraArgs={"ContentType": content_type},
    )


def upload_file(local_path: str, key: str, content_type: str = "video/mp4"):
    client = get_s3_client()
    client.upload_file(
        local_path,
        settings.S3_BUCKET_NAME,
        key,
        ExtraArgs={"ContentType": content_type},
    )


def download_to_file(key: str, local_path: str):
    client = get_s3_client()
    client.download_file(settings.S3_BUCKET_NAME, key, local_path)


def generate_presigned_url(key: str, expires_in: int = 3600, download_filename: str | None = None) -> str:
    """
    Gera URL temporária e segura para download — não expõe o bucket publicamente.
    Define Content-Disposition: attachment para forçar o navegador a BAIXAR o
    arquivo (salvar na pasta Downloads) em vez de abrir o vídeo numa nova aba.
    """
    addressing_style = "path" if settings.S3_FORCE_PATH_STYLE else "auto"
    public_endpoint = settings.S3_PUBLIC_ENDPOINT_URL or settings.S3_ENDPOINT_URL
    kwargs = {
        "aws_access_key_id": settings.S3_ACCESS_KEY_ID,
        "aws_secret_access_key": settings.S3_SECRET_ACCESS_KEY,
        "config": Config(signature_version="s3v4", s3={"addressing_style": addressing_style}),
    }
    if public_endpoint:
        kwargs["endpoint_url"] = public_endpoint
    if settings.S3_REGION and settings.S3_REGION != "auto":
        kwargs["region_name"] = settings.S3_REGION
    client = boto3.client("s3", **kwargs)

    filename = download_filename or key.split("/")[-1]
    params = {
        "Bucket": settings.S3_BUCKET_NAME,
        "Key": key,
        "ResponseContentDisposition": f'attachment; filename="{filename}"',
    }
    return client.generate_presigned_url("get_object", Params=params, ExpiresIn=expires_in)


def delete_key(key: str):
    client = get_s3_client()
    client.delete_object(Bucket=settings.S3_BUCKET_NAME, Key=key)
