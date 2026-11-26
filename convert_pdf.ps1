param(
    [string]$PdfPath = ".\閱讀內容.pdf",
    [string]$Prefix = "article"
)

Add-Type -AssemblyName System.Runtime.WindowsRuntime
Add-Type -AssemblyName System.IO.Compression

$methods = [System.WindowsRuntimeSystemExtensions].GetMethods()
$asTaskGeneric = ($methods | Where-Object { 
    $_.Name -eq 'AsTask' -and 
    $_.IsGenericMethod -and 
    $_.GetParameters().Count -eq 1 -and 
    $_.GetGenericArguments().Count -eq 1
})[0]

$asTaskAction = ($methods | Where-Object {
    $_.Name -eq 'AsTask' -and
    -not $_.IsGenericMethod -and
    $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction'
})[0]

function Await-Op($asyncOp, [Type]$resultType) {
    $genericMethod = $asTaskGeneric.MakeGenericMethod($resultType)
    $task = $genericMethod.Invoke($null, @($asyncOp))
    $task.Wait()
    return $task.Result
}

function Await-Action($asyncAction) {
    $task = $asTaskAction.Invoke($null, @($asyncAction))
    $task.Wait()
}

[Windows.Data.Pdf.PdfDocument, Windows.Data.Pdf, ContentType = WindowsRuntime] | Out-Null

$fullPath = (Resolve-Path $PdfPath).Path
Write-Host "Opening PDF: $fullPath"

$fs = [System.IO.File]::OpenRead($fullPath)
$ras = [System.IO.WindowsRuntimeStreamExtensions]::AsRandomAccessStream($fs)
$pdfDoc = Await-Op ([Windows.Data.Pdf.PdfDocument]::LoadFromStreamAsync($ras)) ([Windows.Data.Pdf.PdfDocument])
Write-Host "Page count: $($pdfDoc.PageCount)"

for ($i = 0; $i -lt $pdfDoc.PageCount; $i++) {
    $page = $pdfDoc.GetPage($i)
    $fileName = "${Prefix}_page$($i+1).png"
    $targetPath = Join-Path (Get-Location) $fileName
    
    $outFs = [System.IO.File]::Open($targetPath, [System.IO.FileMode]::Create)
    $outRas = [System.IO.WindowsRuntimeStreamExtensions]::AsRandomAccessStream($outFs)
    
    $renderOptions = New-Object Windows.Data.Pdf.PdfPageRenderOptions
    $renderOptions.DestinationWidth = 1400
    
    Await-Action ($page.RenderToStreamAsync($outRas, $renderOptions))
    Await-Op ($outRas.FlushAsync()) ([bool]) | Out-Null
    $outRas.Dispose()
    $outFs.Close()
    Write-Host "Generated: $fileName"
}
$ras.Dispose()
$fs.Close()
Write-Host "PDF render complete!"
