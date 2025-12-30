<div align="center"><a name="readme-top"></a>

<img height="120" src="https://embeddr.net/embeddr_logo_transparent.png">

<h1>Embeddr Frontend </h1>
</div>

> [!WARNING]
>
> You do not need this if you want to use Embeddr
>
> This repo is for development only.
>
> Please use [embeddr-cli](https://github.com/embeddr-net/embeddr-cli)


## Development

> Requires [embeddr-cli](https://github.com/embeddr-net/embeddr-cli) to be running.

To get a frontend development server working.

```sh
git clone https://github.com/embeddr-net/embeddr-frontend
cd embeddr-frontend
pnpm install

# The frontend uses VITE_BACKEND_URL
# During buildtime this is set to `/api/v1`
VITE_BACKEND_URL="http://127.0.0.1:8003/api/v1" pnpm dev
```
Once running, open [http://localhost:5173](http://localhost:5173) to view

## Components

Some components are moved to [embeddr-react-ui](https://github.com/embeddr-net/embeddr-react-ui).

This is so things like the Lightbox and Visualizers can be reused across different integrations.
