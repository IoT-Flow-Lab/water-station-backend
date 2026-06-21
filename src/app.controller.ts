import { Controller, Get, Res } from '@nestjs/common';
import * as express from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Controller()
export class AppController {
  @Get()
  getHello(): string {
    return 'Water Station Backend is running. Access the API documentation at /api';
  }

  @Get('api')
  getApiDocs(@Res() res: express.Response) {
    const html = `
<!doctype html>
<html>
  <head>
    <title>Water Station API Reference</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/svg+xml" href="https://nestjs.com/img/logo-small.svg" />
    <style>
      body {
        margin: 0;
        background-color: #0f172a;
      }
    </style>
  </head>
  <body>
    <!-- Scalar API Reference Rendering the raw openapi.yaml -->
    <script
      id="api-reference"
      data-url="/api/openapi.yaml"
      data-configuration='{"theme": "deepSpace"}'></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>
    `;
    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  }

  @Get('api/openapi.yaml')
  getApiYaml(@Res() res: express.Response) {
    const yamlPath = path.join(__dirname, 'openapi.yaml');
    if (fs.existsSync(yamlPath)) {
      res.setHeader('Content-Type', 'text/yaml');
      return res.sendFile(yamlPath);
    } else {
      // Fallback to project root src directory if the compiler build step has a slight delay
      const srcYamlPath = path.join(process.cwd(), 'src', 'openapi.yaml');
      if (fs.existsSync(srcYamlPath)) {
        res.setHeader('Content-Type', 'text/yaml');
        return res.sendFile(srcYamlPath);
      }
      return res.status(404).send('openapi.yaml file not found on disk');
    }
  }
}
