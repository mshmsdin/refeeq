param([int]$MaxBatches=1,[string]$ExpectedProvider='')
$ErrorActionPreference='Stop'
$repo='C:\Users\mshms\Downloads\din.hk\رفيق'
$sourcePath=Join-Path $repo 'docs\translations\sources\tadam-charles-1913.json'
$outDir=Join-Path $repo 'docs\translations\drafts\tadam-charles-1913'
New-Item -ItemType Directory -Force -Path $outDir|Out-Null
$router='https://n22hkfar250zwdvmrsvvw3vf.129.121.89.6.sslip.io'
$clientId=$null
$clientToken=$null
function Invoke-CoolifyCall($toolName,$toolArgs){
  $body=@{jsonrpc='2.0';id=7;method='tools/call';params=@{name=$toolName;arguments=$toolArgs}}|ConvertTo-Json -Depth 20 -Compress
  $r=Invoke-WebRequest -Uri $script:coolifyUrl -Method Post -Headers $script:coolifyHeaders -Body $body -TimeoutSec 60 -UseBasicParsing
  $j=ConvertFrom-Json (($r.Content -split 'data: ')|Select-Object -Last 1)
  if($j.error){throw $j.error.message}
  $txt=($j.result.content|Where-Object{$_.type -eq 'text'}|Select-Object -First 1).text
  if($j.result.isError){throw $txt}
  return $txt
}
try {
  $cfg=Get-Content -Raw 'C:\Users\mshms\.codex\config.toml'
  $script:coolifyUrl=([regex]::Match($cfg,'(?m)^\[mcp_servers\.coolify\][\s\S]*?url\s*=\s*"([^"]+)"')).Groups[1].Value
  $cid=([regex]::Match($cfg,'(?m)^CF-Access-Client-Id\s*=\s*"([^"]+)"')).Groups[1].Value
  $csec=([regex]::Match($cfg,'(?m)^CF-Access-Client-Secret\s*=\s*"([^"]+)"')).Groups[1].Value
  $bear=[Environment]::GetEnvironmentVariable('COOLIFY_MCP_BEARER_TOKEN')
  $script:coolifyHeaders=@{'CF-Access-Client-Id'=$cid;'CF-Access-Client-Secret'=$csec;'Authorization'="Bearer $bear";'Content-Type'='application/json';'Accept'='application/json, text/event-stream'}
  $init=@{jsonrpc='2.0';id=1;method='initialize';params=@{protocolVersion='2025-03-26';capabilities=@{};clientInfo=@{name='codex';version='1'}}}|ConvertTo-Json -Depth 8 -Compress
  $ir=Invoke-WebRequest -Uri $script:coolifyUrl -Method Post -Headers $script:coolifyHeaders -Body $init -TimeoutSec 30 -UseBasicParsing
  $script:coolifyHeaders['Mcp-Session-Id']=([string[]]$ir.Headers['mcp-session-id'])[0]
  $script:coolifyHeaders['MCP-Protocol-Version']='2025-03-26'
  $script:coolifyHeaders['Cookie']=((@($ir.Headers['Set-Cookie'])|Where-Object{$_ -match '^CF_Authorization='}|ForEach-Object{($_ -split ';')[0]}) -join '; ')
  $null=Invoke-WebRequest -Uri $script:coolifyUrl -Method Post -Headers $script:coolifyHeaders -Body (@{jsonrpc='2.0';method='notifications/initialized'}|ConvertTo-Json -Compress) -TimeoutSec 30 -UseBasicParsing
  $envRaw=Invoke-CoolifyCall 'env_vars' @{action='list';resource='application';uuid='n22hkfar250zwdvmrsvvw3vf';key='ROUTER_ADMIN_TOKEN';reveal=$true}
  $envRows=ConvertFrom-Json -InputObject $envRaw
  $admin=[string]((@($envRows)|Where-Object{$_.key -eq 'ROUTER_ADMIN_TOKEN'}|Select-Object -First 1).value)
  if(!$admin){throw 'لم يرجع سند اعتماد الموجّه'}
  $adminHeaders=@{Authorization="Bearer $admin";Accept='application/json';'Content-Type'='application/json'}
  $scope=@{tenantId='rafeeq-bible-translation';applicationId='rafeeq-bible-translation';serviceKey='bible-translation'}|ConvertTo-Json -Compress
  $client=Invoke-RestMethod -Uri "$router/v1/clients" -Method Post -Headers $adminHeaders -Body $scope -TimeoutSec 30
  $clientId=$client.id;$clientToken=$client.token
  if(!$clientToken){throw 'لم يرجع سند اعتماد الترجمة'}
  $auth=@{Authorization="Bearer $clientToken";Accept='application/json';'Content-Type'='application/json'}
  $source=Get-Content -Raw $sourcePath|ConvertFrom-Json
  $inventory=Get-Content -Raw (Join-Path $repo 'docs\translations\2026-11-13-inventory.json')|ConvertFrom-Json
  $rightsNotice='English translation by R. H. Charles, Oxford 1913; public-domain edition.'
  $sha=[string]$source.source_sha256
  if(!$sha){throw 'بصمة المصدر المرجعية غير موجودة'}
  $success=0;$failed=0;$skipped=0;$attempted=0
  $all=@($source.units)
  for($start=0;$start -lt $all.Count;$start+=5){
      if($attempted -ge $MaxBatches){break}
      $batch=@($all|Select-Object -Skip $start -First 5)
      $first=$start+1;$last=$start+$batch.Count
      $stem=('tadam-charles-{0:D3}-{1:D3}' -f $first,$last)
      $draftPath=Join-Path $outDir "$stem.draft.json"
      $covered=$false
      foreach($existingFile in Get-ChildItem -LiteralPath $outDir -Filter "tadam-charles-*.draft.json"){
        $existing=Get-Content -Raw $existingFile.FullName|ConvertFrom-Json
        if([int]$existing.batch_start -le $first -and [int]$existing.batch_end -ge $last){$covered=$true;break}
      }
      if((Test-Path $draftPath) -or $covered){$skipped++;continue}
      $attempted++
      $inputUnits=@($batch|ForEach-Object{@{chapter=[int]$_.chapter;source_ref=([string]$_.chapter+':'+[string]$_.source_verse_label);text=$_.source_text}})
      $payload=@{book_code='TADAM';units=$inputUnits}|ConvertTo-Json -Depth 12 -Compress
      $expectedRefs=(@($inputUnits|ForEach-Object{$_.source_ref}) -join ', ')
      $request=@{request_id=[guid]::NewGuid().ToString();tenant_id='rafeeq-bible-translation';application_id='rafeeq-bible-translation';service_key='bible-translation';source_sha256=$sha;messages=@(@{role='system';content='ترجم كل وحدة إنجليزية إلى العربية الفصحى بدقة واكتمال، مع حفظ المعنى والأسماء والإشارات الكتابية. لا تضف معلومات غير موجودة، ولا تكتب ملاحظات أو شروحاً. أخرج JSON فقط وفق الشكل: {"book_code":"TADAM","verses":[{"chapter":1,"verse":1,"text_ar":"..."}]}. أخرج وحدة واحدة لكل مدخل بالترتيب. إذا كان مرجع المصدر مجمّعاً مثل 1,2 فترجم نصه مرة واحدة واجعل verse أول رقم فقط، ولا تقسّمه إلى وحدتين.'},@{role='user';content=$payload});response_format="JSON schema with book_code and verses. Each item has integer chapter, integer verse, and Arabic text_ar. Return one item per input unit, in input order, using the first printed number when a source label is grouped: $expectedRefs."}
      $reqPath=Join-Path $outDir "$stem.request.json";$respPath=Join-Path $outDir "$stem.response.json"
      $request|ConvertTo-Json -Depth 20|Set-Content -LiteralPath $reqPath -Encoding utf8
      $ok=$false;$lastError=''
      for($attempt=1;$attempt -le 1 -and !$ok;$attempt++){
        try{
          $schema=@{type='object';additionalProperties=$false;properties=@{book_code=@{type='string'};verses=@{type='array';items=@{type='object';additionalProperties=$false;properties=@{chapter=@{type='integer'};verse=@{type='integer'};text_ar=@{type='string'}};required=@('chapter','verse','text_ar')}}};required=@('book_code','verses')}; $format=@{type='json_schema';json_schema=@{name='arabic_translation';strict=$true;schema=$schema}}; $apiBody=@{tenant_id=$request.tenant_id;application_id=$request.application_id;service_key=$request.service_key;messages=$request.messages;response_format=$format;max_output_tokens=2048};           $jsonBody=$apiBody|ConvertTo-Json -Depth 25 -Compress
          Add-Type -AssemblyName System.Net.Http
          $httpClient=New-Object System.Net.Http.HttpClient
          $httpReq=New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Post,"$router/v1/responses")
          $httpReq.Headers.Authorization=[System.Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer',$clientToken)
          $httpReq.Content=[System.Net.Http.StringContent]::new($jsonBody,[System.Text.Encoding]::UTF8,'application/json')
          $httpRes=$httpClient.SendAsync($httpReq).GetAwaiter().GetResult()
          $httpText=$httpRes.Content.ReadAsStringAsync().GetAwaiter().GetResult()
          if(-not $httpRes.IsSuccessStatusCode){throw "HTTP $([int]$httpRes.StatusCode): $httpText"}
          $response=ConvertFrom-Json $httpText
          $response|ConvertTo-Json -Depth 30|Set-Content -LiteralPath $respPath -Encoding utf8
          if($ExpectedProvider -and [string]$response.provider -ne $ExpectedProvider){throw "لم ينفذ الطلب عبر المزود المتوقع؛ المزود الفعلي: $($response.provider)"}
          $result=ConvertFrom-Json ([string]$response.content)
          $got=@($result.verses)
          if($result.book_code -ne 'TADAM' -or $got.Count -ne $batch.Count){throw "عدد الوحدات غير صحيح: $($got.Count)/$($batch.Count)"}
          $mapped=@()
          for($i=0;$i -lt $batch.Count;$i++){
            $expectedRef=[string]$batch[$i].chapter+':'+[string]$batch[$i].source_verse_label
            $expectedVerse=[int]($batch[$i].source_verse_label.Split(',')[0])
            if([int]$got[$i].chapter -ne [int]$batch[$i].chapter -or [int]$got[$i].verse -ne $expectedVerse -or [string]::IsNullOrWhiteSpace([string]$got[$i].text_ar) -or ([string]$got[$i].text_ar -match '[A-Za-z]') -or ([string]$got[$i].text_ar -notmatch '[\u0600-\u06FF]')){throw "تسلسل أو نص الوحدة $expectedRef غير صالح"}
            $mapped+=@{chapter=[int]$batch[$i].chapter;source_ref=$expectedRef;text_ar=[string]$got[$i].text_ar}
          }
          $draft=[ordered]@{book_code='TADAM';source_license_notice=$rightsNotice;translation_name_ar='ترجمة محمد بن شمس الدين';source_translation='en-charles-1913-latin-recension';source_name=$source.edition_title;source_url=$source.source_url;source_sha256=$sha;batch_start=$first;batch_end=$last;status='machine_translated_structured';review_status='pending_human';imported=$false;published=$false;routing_method=$(if($ExpectedProvider){'temporary_policy_allowlist'}else{'service_policy'});provider=$response.provider;model=$response.model;request_id=$response.request_id;failovers=$response.failovers;attempts=$response.attempts;usage=$response.usage;estimated_cost=$response.estimatedCost;units=$mapped}
          $draft|ConvertTo-Json -Depth 30|Set-Content -LiteralPath $draftPath -Encoding utf8
          Remove-Item -LiteralPath (Join-Path $outDir "$stem.failure.txt") -ErrorAction SilentlyContinue
          $success++;$ok=$true;Start-Sleep -Seconds 12
          Write-Output "اكتملت الدفعة $first-$last؛ المزوّد: $($response.provider)، انتقالات المزوّد: $($response.failovers)"
        }catch{
          $lastError=$_.Exception.Message
          Start-Sleep -Seconds 2
      }
          if(!$ok){$failed++;Set-Content -LiteralPath (Join-Path $outDir "$stem.failure.txt") -Value $lastError -Encoding utf8;Write-Output "تعذرت الدفعة ${first}-${last}: $lastError";Start-Sleep -Seconds 12}
    }
  }
  Write-Output "اكتملت الجولة: نجاح $success، تعذر $failed، تخطي $skipped"
}
finally{
  if($clientId -and $admin){try{Invoke-RestMethod -Uri "$router/v1/clients/$clientId" -Method Delete -Headers $adminHeaders -TimeoutSec 20|Out-Null}catch{}}
}




















