# Exporta el archivo original sin redibujar ni recortar el logotipo.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$frontendRoot = Split-Path $PSScriptRoot -Parent
$resRoot = Join-Path $frontendRoot 'android/app/src/main/res'
$source = [System.Drawing.Image]::FromFile((Join-Path $frontendRoot 'resources/productos-osuna.jfif'))

function Export-Logo([string]$RelativePath, [int]$Size, [double]$Scale = 1, [bool]$Transparent = $false, [bool]$Round = $false) {
    $output = Join-Path $frontendRoot $RelativePath
    New-Item -ItemType Directory -Force -Path (Split-Path $output -Parent) | Out-Null
    $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        if ($Round) {
            $clip = New-Object System.Drawing.Drawing2D.GraphicsPath
            try {
                $clip.AddEllipse(0, 0, $Size, $Size)
                $graphics.SetClip($clip)
            } finally { $clip.Dispose() }
        }
        if (-not $Transparent) { $graphics.FillRectangle([System.Drawing.Brushes]::White, 0, 0, $Size, $Size) }
        $logoSize = [int][Math]::Round($Size * $Scale)
        $x = [int][Math]::Round(($Size - $logoSize) / 2)
        $graphics.DrawImage($source, $x, $x, $logoSize, $logoSize)
        $bitmap.Save($output, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally { $graphics.Dispose(); $bitmap.Dispose() }
}

try {
    Export-Logo 'src/assets/productos-osuna.png' 440
    Export-Logo 'public/favicon.png' 64 0.9
    Export-Logo 'public/apple-touch-icon.png' 180 0.9
    $densities = @(
        @{ Name = 'mdpi'; Factor = 1 }, @{ Name = 'hdpi'; Factor = 1.5 },
        @{ Name = 'xhdpi'; Factor = 2 }, @{ Name = 'xxhdpi'; Factor = 3 },
        @{ Name = 'xxxhdpi'; Factor = 4 }
    )
    foreach ($density in $densities) {
        $name = $density.Name
        Export-Logo "android/app/src/main/res/mipmap-$name/ic_launcher.png" ([int](48 * $density.Factor)) 0.86
        Export-Logo "android/app/src/main/res/mipmap-$name/ic_launcher_round.png" ([int](48 * $density.Factor)) 0.82 $false $true
        # El lienzo adaptativo mide 108dp; el logo ocupa 60dp para respetar las mascaras del launcher.
        Export-Logo "android/app/src/main/res/mipmap-$name/ic_launcher_foreground.png" ([int](108 * $density.Factor)) (60.0 / 108) $true
        Export-Logo "android/app/src/main/res/drawable-$name/brand_splash.png" ([int](144 * $density.Factor))
    }
    # Se sustituyen los fondos de inicio de Capacitor por un bitmap centrado, sin estirar.
    Get-ChildItem -LiteralPath $resRoot -Recurse -File -Filter 'splash.png' | ForEach-Object {
        Remove-Item -LiteralPath $_.FullName
    }
} finally { $source.Dispose() }
