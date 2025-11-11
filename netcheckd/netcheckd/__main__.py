import asyncio
from .service import AppService


def main():
    svc = AppService()
    asyncio.run(svc.run())


if __name__ == "__main__":
    main()






