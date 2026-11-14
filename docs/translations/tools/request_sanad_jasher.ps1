param([int]$MaxBatches = 5, [int]$BatchSize = 5)
$ErrorActionPreference = 'Stop'

$repo = 'C:\Users\mshms\Downloads\din.hk\رفيق'
$router = 'https://n22hkfar250zwdvmrsvvw3vf.129.121.89.6.sslip.io'
$sourcePath = Join-Path $repo 'docs\translations\sources\jasher-ccel-1887-reprint.json'
$outDir = Join-Path $repo 'docs\translations\drafts\jasher-ccel-1887-reprint'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$clientId = $null
$admin = $null

function Invoke-CoolifyCall($url, $headers, $toolName, $toolArgs) {
  $body = @{ jsonrpc = '2.0'; id = 7; method = 'tools/call'; params = @{ name = $toolName; arguments = $toolArgs } } | ConvertTo-Json -Depth 20 -Compress
  $response = Invoke-WebRequest -Uri $url -Method Post -Headers $headers -Body $body -TimeoutSec 60 -UseBasicParsing
  $result = ConvertFrom-Json (($response.Content -split 'data: ') | Select-Object -Last 1)
  if ($result.error) { throw 'Coolify MCP request failed' }
  $text = ($result.result.content | Where-Object { $_.type -eq 'text' } | Select-Object -First 1).text
  if ($result.result.isError) { throw 'Coolify MCP tool failed' }
  return $text
}

try {
  $config = Get-Content -Raw 'C:\Users\mshms\.codex\config.toml'
  $coolifyUrl = ([regex]::Match($config, '(?m)^\[mcp_servers\.coolify\][\s\S]*?url\s*=\s*"([^"]+)"')).Groups[1].Value
  $clientAccessId = ([regex]::Match($config, '(?m)^CF-Access-Client-Id\s*=\s*"([^"]+)"')).Groups[1].Value
  $clientAccessSecret = ([regex]::Match($config, '(?m)^CF-Access-Client-Secret\s*=\s*"([^"]+)"')).Groups[1].Value
  $bearer = [Environment]::GetEnvironmentVariable('COOLIFY_MCP_BEARER_TOKEN')
  if (!$coolifyUrl -or !$clientAccessId -or !$clientAccessSecret -or !$bearer) { throw 'Cloudflare/Coolify access configuration is incomplete' }

  $coolifyHeaders = @{
    'CF-Access-Client-Id' = $clientAccessId
    'CF-Access-Client-Secret' = $clientAccessSecret
    Authorization = "Bearer $bearer"
    'Content-Type' = 'application/json'
    Accept = 'application/json, text/event-stream'
  }
  $initialize = @{ jsonrpc = '2.0'; id = 1; method = 'initialize'; params = @{ protocolVersion = '2025-03-26'; capabilities = @{}; clientInfo = @{ name = 'codex'; version = '1' } } } | ConvertTo-Json -Depth 8 -Compress
  $initializedResponse = Invoke-WebRequest -Uri $coolifyUrl -Method Post -Headers $coolifyHeaders -Body $initialize -TimeoutSec 30 -UseBasicParsing
  $coolifyHeaders['Mcp-Session-Id'] = ([string[]]$initializedResponse.Headers['mcp-session-id'])[0]
  $coolifyHeaders['MCP-Protocol-Version'] = '2025-03-26'
  $coolifyHeaders.Cookie = ((@($initializedResponse.Headers['Set-Cookie']) | Where-Object { $_ -match '^CF_Authorization=' } | ForEach-Object { ($_ -split ';')[0] }) -join '; ')
  $null = Invoke-WebRequest -Uri $coolifyUrl -Method Post -Headers $coolifyHeaders -Body (@{ jsonrpc = '2.0'; method = 'notifications/initialized' } | ConvertTo-Json -Compress) -TimeoutSec 30 -UseBasicParsing

  $envText = Invoke-CoolifyCall $coolifyUrl $coolifyHeaders 'env_vars' @{ action = 'list'; resource = 'application'; uuid = 'n22hkfar250zwdvmrsvvw3vf'; key = 'ROUTER_ADMIN_TOKEN'; reveal = $true }
  $envRows = ConvertFrom-Json -InputObject $envText
  $admin = [string]((@($envRows) | Where-Object { $_.key -eq 'ROUTER_ADMIN_TOKEN' } | Select-Object -First 1).value)
  if (!$admin) { throw 'Sanad router credential was not returned' }

  $adminHeaders = @{ Authorization = "Bearer $admin"; Accept = 'application/json'; 'Content-Type' = 'application/json' }
  $policyResponse = Invoke-WebRequest -Uri "$router/v1/service-policies" -Headers $adminHeaders -TimeoutSec 30 -UseBasicParsing
  $policies = @(ConvertFrom-Json -InputObject $policyResponse.Content)
  $policy = $policies | Where-Object { $_.applicationId -eq 'rafeeq-bible-translation' -and $_.serviceKey -eq 'bible-translation' } | Select-Object -First 1
  if (!$policy -or $policy.mode -ne 'budgeted' -or $policy.operation -ne 'responses') { throw 'Translation service policy is not active and budgeted' }
  $budgetResponse = Invoke-WebRequest -Uri "$router/v1/service-budgets" -Headers $adminHeaders -TimeoutSec 30 -UseBasicParsing
  $budgets = @(ConvertFrom-Json -InputObject $budgetResponse.Content)
  $budget = $budgets | Where-Object { $_.applicationId -eq 'rafeeq-bible-translation' -and $_.serviceKey -eq 'bible-translation' } | Select-Object -First 1
  if (!$budget) { throw 'Translation service budget was not returned' }
  $beforeRemaining = [decimal]$budget.monthlyBudgetUsd - [decimal]$budget.chargedUsd - [decimal]$budget.reservedUsd
  Write-Output ('ميزانية الترجمة قبل الدفعات: {0} دولار متبقٍ؛ إصدار السياسة {1}.' -f $beforeRemaining, $policy.version)

  $scope = @{ tenantId = 'rafeeq-bible-translation'; applicationId = 'rafeeq-bible-translation'; serviceKey = 'bible-translation' } | ConvertTo-Json -Compress
  $client = Invoke-RestMethod -Uri "$router/v1/clients" -Method Post -Headers $adminHeaders -Body $scope -TimeoutSec 30
  $clientId = $client.id
  $clientToken = [string]$client.token
  if (!$clientToken) { throw 'Sanad did not return a scoped translation client' }
  $clientHeaders = @{ Authorization = "Bearer $clientToken"; Accept = 'application/json'; 'Content-Type' = 'application/json' }

  $source = Get-Content -Raw -LiteralPath $sourcePath | ConvertFrom-Json
  if (@($source.units).Count -ne 3910 -or !$source.source_sha256) { throw 'The complete and checksummed source was not found' }
  $allUnits = @($source.units)
  if ($BatchSize -lt 1 -or $BatchSize -gt 10) { throw 'BatchSize must be between 1 and 10' }
  $coveredRefs = @{}
  Get-ChildItem -LiteralPath $outDir -Filter '*.draft.json' | ForEach-Object {
    $existingDraft = Get-Content -Raw -LiteralPath $_.FullName | ConvertFrom-Json
    foreach ($existingUnit in $existingDraft.units) { $coveredRefs[[string]$existingUnit.source_ref] = $true }
  }
  $sourcePositions = @{}
  for ($sourceIndex = 0; $sourceIndex -lt $allUnits.Count; $sourceIndex++) {
    $sourcePositions[[string]$allUnits[$sourceIndex].source_ref] = $sourceIndex + 1
  }
  $success = 0
  $failed = 0
  $skipped = 0
  $attempted = 0
  for ($start = 60; $start -lt $allUnits.Count; $start += $BatchSize) {
    if ($attempted -ge $MaxBatches) { break }
    $window = @($allUnits | Select-Object -Skip $start -First $BatchSize)
    $batch = @($window | Where-Object { !$coveredRefs.ContainsKey([string]$_.source_ref) })
    if ($batch.Count -eq 0) { $skipped++; continue }
    $first = $sourcePositions[[string]$batch[0].source_ref]
    $last = $sourcePositions[[string]$batch[-1].source_ref]
    $stem = 'jasher-ccel-1887-{0:D4}-{1:D4}' -f $first, $last
    $draftPath = Join-Path $outDir "$stem.draft.json"
    if (Test-Path -LiteralPath $draftPath) { $skipped++; continue }

    $attempted++
    $inputUnits = @($batch | ForEach-Object { @{ chapter = [int]$_.chapter; verse = [int]$_.verse; source_ref = [string]$_.source_ref; text = [string]$_.source_text } })
    $expectedRefs = @($inputUnits | ForEach-Object { $_.source_ref })
    $payload = @{ book_code = 'JASHER'; units = $inputUnits } | ConvertTo-Json -Depth 12 -Compress
    $request = @{
      request_id = [guid]::NewGuid().ToString()
      tenant_id = 'rafeeq-bible-translation'
      application_id = 'rafeeq-bible-translation'
      service_key = 'bible-translation'
      source_sha256 = [string]$source.source_sha256
      messages = @(
        @{ role = 'system'; content = 'Translate each English source unit into accurate, complete Modern Standard Arabic. Preserve meaning, names, scripture references, and unit order. Do not add explanations or content. Output JSON only: {"book_code":"JASHER","verses":[{"chapter":1,"verse":1,"source_ref":"1:1","text_ar":"..."}]}. Return exactly one row for each input source_ref.' },
        @{ role = 'user'; content = $payload }
      )
    }
    $requestPath = Join-Path $outDir "$stem.request.json"
    $responsePath = Join-Path $outDir "$stem.response.json"
    $failurePath = Join-Path $outDir "$stem.failure.txt"
    $request | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $requestPath -Encoding utf8
    try {
      $schema = @{
        type = 'object'; additionalProperties = $false
        properties = @{
          book_code = @{ type = 'string' }
          verses = @{ type = 'array'; items = @{
            type = 'object'; additionalProperties = $false
            properties = @{ chapter = @{ type = 'integer' }; verse = @{ type = 'integer' }; source_ref = @{ type = 'string' }; text_ar = @{ type = 'string' } }
            required = @('chapter', 'verse', 'source_ref', 'text_ar')
          } }
        }
        required = @('book_code', 'verses')
      }
      $responseFormat = @{ type = 'json_schema'; json_schema = @{ name = 'arabic_translation'; strict = $true; schema = $schema } }
      $body = @{ tenant_id = $request.tenant_id; application_id = $request.application_id; service_key = $request.service_key; messages = $request.messages; response_format = $responseFormat; max_output_tokens = 2048 } | ConvertTo-Json -Depth 25 -Compress
      try {
        $httpResponse = Invoke-WebRequest -Uri "$router/v1/responses" -Method Post -Headers $clientHeaders -Body $body -TimeoutSec 180 -UseBasicParsing
      } catch {
        $httpStatus = 0
        $httpErrorBody = ''
        if ($_.Exception.Response) {
          $httpStatus = [int]$_.Exception.Response.StatusCode
          try {
            $errorReader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
            $httpErrorBody = $errorReader.ReadToEnd()
            $errorReader.Dispose()
          } catch { }
        }
        throw "Sanad HTTP $httpStatus`: $httpErrorBody"
      }
      $response = ConvertFrom-Json -InputObject $httpResponse.Content
      $response | ConvertTo-Json -Depth 35 | Set-Content -LiteralPath $responsePath -Encoding utf8
      $translated = ConvertFrom-Json ([string]$response.content)
      $rows = @($translated.verses)
      if ($translated.book_code -ne 'JASHER' -or $rows.Count -ne $batch.Count) { throw "Unexpected row count: $($rows.Count)/$($batch.Count)" }

      $mapped = @()
      for ($i = 0; $i -lt $batch.Count; $i++) {
        $expected = $batch[$i]
        $row = $rows[$i]
        $ref = [string]$expected.source_ref
        if ([string]$row.source_ref -ne $ref -or [int]$row.chapter -ne [int]$expected.chapter -or [int]$row.verse -ne [int]$expected.verse) { throw "Reference/order mismatch at $ref" }
        $arabic = [string]$row.text_ar
        if ([string]::IsNullOrWhiteSpace($arabic) -or $arabic -match '[A-Za-z]' -or $arabic -notmatch '[\u0600-\u06FF]') { throw "Invalid Arabic text at $ref" }
        $mapped += @{ chapter = [int]$expected.chapter; source_ref = $ref; text_ar = $arabic }
      }

      $draft = [ordered]@{
        book_code = 'JASHER'; source_license_notice = 'Public-domain English translation identified as 1840, in an 1887 exact-edition reprint; human review required.'
        translation_name_ar = 'ترجمة محمد بن شمس الدين'; source_translation = 'jasher-ccel-1887-reprint'
        source_name = 'The Book of Jasher; 1840 English translation, 1887 exact-edition reprint'; source_url = $source.source_url
        source_sha256 = [string]$source.source_sha256; batch_start = $first; batch_end = $last
        status = 'machine_translated_structured'; review_status = 'pending_human'; imported = $false; published = $false
        routing_method = 'service_policy_with_provider_failover'; provider = $response.provider; model = $response.model
        request_id = $response.request_id; failovers = $response.failovers; attempts = $response.attempts
        usage = $response.usage; estimated_cost = $response.estimatedCost; units = $mapped
      }
      $draft | ConvertTo-Json -Depth 35 | Set-Content -LiteralPath $draftPath -Encoding utf8
      foreach ($mappedUnit in $mapped) { $coveredRefs[[string]$mappedUnit.source_ref] = $true }
      Remove-Item -LiteralPath $failurePath -ErrorAction SilentlyContinue
      $success++
      Write-Output ('حُفظت الدفعة {0}-{1} عبر {2}؛ انتقالات المزوّد: {3}؛ الكلفة: {4} دولار.' -f $first, $last, $response.provider, $response.failovers, $response.estimatedCost)
    } catch {
      $failed++
      $_.Exception.Message | Set-Content -LiteralPath $failurePath -Encoding utf8
      Write-Output ('تعذرت الدفعة {0}-{1}: {2}' -f $first, $last, $_.Exception.Message)
    }
    if ($attempted -lt $MaxBatches) { Start-Sleep -Seconds 60 }
  }

  $failureFiles = @(Get-ChildItem -LiteralPath $outDir -Filter '*.failure.txt')
  foreach ($failureFile in $failureFiles) {
    if ($failureFile.BaseName -notmatch '^jasher-ccel-1887-(\d+)-(\d+)$') { continue }
    $failureStart = [int]$Matches[1]
    $failureEnd = [int]$Matches[2]
    if ($failureStart -lt 1 -or $failureEnd -gt $allUnits.Count -or $failureEnd -lt $failureStart) { continue }
    $fullyResolved = $true
    for ($position = $failureStart; $position -le $failureEnd; $position++) {
      $ref = [string]$allUnits[$position - 1].source_ref
      if ($coveredRefs.ContainsKey($ref)) { continue }
      $coveredByNarrowFailure = $false
      foreach ($otherFailure in $failureFiles) {
        if ($otherFailure.FullName -eq $failureFile.FullName -or $otherFailure.BaseName -notmatch '^jasher-ccel-1887-(\d+)-(\d+)$') { continue }
        $otherStart = [int]$Matches[1]
        $otherEnd = [int]$Matches[2]
        if ($otherStart -le $position -and $otherEnd -ge $position -and ($otherEnd - $otherStart) -lt ($failureEnd - $failureStart)) {
          $coveredByNarrowFailure = $true
          break
        }
      }
      if (!$coveredByNarrowFailure) { $fullyResolved = $false; break }
    }
    if ($fullyResolved) { Remove-Item -LiteralPath $failureFile.FullName -ErrorAction SilentlyContinue }
  }

  $budgetResponseAfter = Invoke-WebRequest -Uri "$router/v1/service-budgets" -Headers $adminHeaders -TimeoutSec 30 -UseBasicParsing
  $budgetsAfter = @(ConvertFrom-Json -InputObject $budgetResponseAfter.Content)
  $budgetAfter = $budgetsAfter | Where-Object { $_.applicationId -eq 'rafeeq-bible-translation' -and $_.serviceKey -eq 'bible-translation' } | Select-Object -First 1
  $remainingAfter = [decimal]$budgetAfter.monthlyBudgetUsd - [decimal]$budgetAfter.chargedUsd - [decimal]$budgetAfter.reservedUsd
  Write-Output ('انتهت الجولة: نجاح {0}، تعذر {1}، تخطي {2}؛ الرصيد المتبقي {3} دولار.' -f $success, $failed, $skipped, $remainingAfter)
} finally {
  if ($clientId -and $admin) {
    try { Invoke-RestMethod -Uri "$router/v1/clients/$clientId" -Method Delete -Headers $adminHeaders -TimeoutSec 20 | Out-Null; Write-Output 'أُلغيت صلاحية العميل المؤقت.' }
    catch { Write-Output 'تعذر تأكيد إلغاء العميل المؤقت؛ تحقّق من قائمة العملاء.' }
  }
}
