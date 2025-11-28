$H = New-Object Net.HttpListener
$H.Prefixes.Add("http://localhost:8080/")
$H.Start()
Write-Host "Server started at http://localhost:8080/"
While ($H.IsListening) {
    $C = $H.GetContext()
    $R = $C.Response
    $Path = "$PWD$($C.Request.Url.LocalPath)"
    If (Test-Path $Path -PathType Leaf) {
        $Content = [IO.File]::ReadAllBytes($Path)
        $R.ContentLength64 = $Content.Length
        $R.ContentType = switch ([IO.Path]::GetExtension($Path)) {
            ".html" { "text/html" }
            ".css"  { "text/css" }
            ".js"   { "application/javascript" }
            default { "application/octet-stream" }
        }
        $R.OutputStream.Write($Content, 0, $Content.Length)
    } Else {
        $R.StatusCode = 404
    }
    $R.Close()
}
