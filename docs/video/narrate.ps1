# Narration for the walkthrough video, fully offline (Windows text-to-speech).
#
# Reads script.md: every "## N. Title (m:ss)" heading is a scene and its "> "
# lines are the narration (a bare ">" line separates paragraphs). The
# Pronunciation table is applied to the spoken text only; captions keep the
# written words. For each scene it writes out/audio/sceneNN.wav and records
# where every sentence starts, so record.mjs can time the on-screen actions
# and assemble.mjs can build captions and chapter times from the same clock.
#
#   pwsh -File narrate.ps1 [-Voice "Microsoft Mark"] [-Rate -1] [-PauseMs 1200]
param(
    [string]$Voice = 'Microsoft Mark',
    [int]$Rate = -1,
    [int]$PauseMs = 1200,
    [double]$LeadIn = 0.8,      # seconds of picture before the voice starts
    [double]$Tail = 1.0         # seconds after the last word before the scene may end
)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$scriptPath = Join-Path $root 'script.md'
$outDir = Join-Path $root 'out\audio'
New-Item -ItemType Directory -Force $outDir | Out-Null

# Needs PowerShell 7 (pwsh): Windows PowerShell 5.1 only sees the older
# "Desktop" voices, not Microsoft Mark.
Add-Type -AssemblyName System.Speech
$speechDll = [System.Speech.Synthesis.SpeechSynthesizer].Assembly.Location
$refs = @($speechDll, 'System.Collections', 'System.Runtime', 'System.ComponentModel.Primitives', 'System.ComponentModel.EventBasedAsync', 'netstandard')
Add-Type -ReferencedAssemblies $refs -TypeDefinition @'
using System.Collections.Generic;
using System.Speech.Synthesis;
public class PicBookmarks {
    public List<string> Names = new List<string>();
    public List<double> Times = new List<double>();
    public void Attach(SpeechSynthesizer s) {
        s.BookmarkReached += (o, e) => { Names.Add(e.Bookmark); Times.Add(e.AudioPosition.TotalSeconds); };
    }
    public void Clear() { Names.Clear(); Times.Clear(); }
}
'@

$lines = Get-Content $scriptPath -Encoding UTF8

# --- pronunciation: "| Written | Spoken |" rows under "## Pronunciation" ---
$say = [ordered]@{}; $inTable = $false
foreach ($line in $lines) {
    if ($line -match '^## ') { $inTable = $line -match '^## Pronunciation'; continue }
    if (-not $inTable -or $line -notmatch '^\|(.+)\|(.+)\|\s*$') { continue }
    $w = ($Matches[1].Trim() -replace '`', ''); $s = $Matches[2].Trim()
    if ($w -eq 'Written' -or $w -match '^-+$' -or $w -match '\(') { continue }
    $sep = if ($w -match ' / ') { ' / ' } else { ', ' }
    $ws = $w -split [regex]::Escape($sep); $ss = $s -split [regex]::Escape($sep)
    for ($i = 0; $i -lt $ws.Count -and $i -lt $ss.Count; $i++) { $say[$ws[$i].Trim()] = $ss[$i].Trim() }
}
$sayKeys = @($say.Keys | Sort-Object { - $_.Length })   # longest first: counter-UAS before UAS
function ConvertTo-Spoken([string]$t) {
    foreach ($k in $sayKeys) { $t = [regex]::Replace($t, '(?<![\w/])' + [regex]::Escape($k) + '(?![\w])', $say[$k]) }
    return $t
}

# --- scenes ---
$scenes = New-Object System.Collections.ArrayList; $cur = $null; $para = ''
function Close-Paragraph { if ($script:cur -and $script:para.Trim()) { [void]$script:cur.Paragraphs.Add($script:para.Trim()) }; $script:para = '' }
foreach ($line in $lines) {
    if ($line -match '^## (\d+)\. (.+?) \((\d+):(\d+)\)\s*$') {
        Close-Paragraph
        $cur = [pscustomobject]@{ N = [int]$Matches[1]; Title = $Matches[2]; Target = [int]$Matches[3] * 60 + [int]$Matches[4]; Paragraphs = (New-Object System.Collections.ArrayList) }
        [void]$scenes.Add($cur)
    } elseif ($cur -and $line -match '^>\s?(.*)$') {
        if ($Matches[1].Trim()) { $para += ' ' + $Matches[1].Trim() } else { Close-Paragraph }
    } elseif ($cur -and $line -match '^##') {
        Close-Paragraph
    }
}
Close-Paragraph

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice($Voice)
$synth.Rate = $Rate
$marks = New-Object PicBookmarks
$marks.Attach($synth)

$result = @(); $clock = 0.0
foreach ($sc in $scenes) {
    $sentences = @(); $paraStarts = @()
    $hasVoice = $sc.Paragraphs.Count -gt 0
    $spoken = 0.0
    if ($hasVoice) {
        $prompt = New-Object System.Speech.Synthesis.PromptBuilder
        $si = 0
        for ($p = 0; $p -lt $sc.Paragraphs.Count; $p++) {
            $parts = [regex]::Split($sc.Paragraphs[$p], '(?<=[.!?])\s+(?=[A-Z"])')
            foreach ($part in $parts) {
                if (-not $part.Trim()) { continue }
                $prompt.AppendBookmark("s$si")
                $prompt.AppendText((ConvertTo-Spoken $part.Trim()))
                $sentences += [pscustomobject]@{ i = $si; paragraph = $p; text = $part.Trim(); start = 0.0; end = 0.0 }
                $si++
            }
            if ($p -lt $sc.Paragraphs.Count - 1) { $prompt.AppendBreak([TimeSpan]::FromMilliseconds($PauseMs)) }
        }
        $prompt.AppendBookmark('end')
        $marks.Clear()
        $wav = Join-Path $outDir ('scene{0:D2}.wav' -f $sc.N)
        $synth.SetOutputToWaveFile($wav)
        $synth.Speak($prompt)
        $synth.SetOutputToNull()

        $bytes = [System.IO.File]::ReadAllBytes($wav)
        $byteRate = [BitConverter]::ToInt32($bytes, 28)
        $spoken = ($bytes.Length - 44) / [double]$byteRate
        # Bookmark positions come back on a 16 kHz clock while the file is
        # written at 22.05 kHz; rescale so the final bookmark lands on the
        # real end of the audio.
        $at = @{}
        for ($k = 0; $k -lt $marks.Names.Count; $k++) { $at[$marks.Names[$k]] = $marks.Times[$k] }
        $scale = if ($at.ContainsKey('end') -and $at['end'] -gt 0) { $spoken / $at['end'] } else { 1.0 }
        foreach ($key in @($at.Keys)) { $at[$key] = $at[$key] * $scale }
        for ($k = 0; $k -lt $sentences.Count; $k++) {
            $sentences[$k].start = [math]::Round($at["s$k"], 3)
            $next = if ($k + 1 -lt $sentences.Count) { $at["s$($k + 1)"] } elseif ($at.ContainsKey('end')) { $at['end'] } else { $spoken }
            $sentences[$k].end = [math]::Round($next, 3)
        }
        for ($p = 0; $p -lt $sc.Paragraphs.Count; $p++) {
            $paraStarts += ($sentences | Where-Object { $_.paragraph -eq $p } | Select-Object -First 1).start
        }
    }
    # Scene 0 opens on the title card for 5 s before the chapter card and voice.
    $lead = if ($sc.N -eq 0) { 5.0 } else { $LeadIn }
    $length = [math]::Max($sc.Target, $(if ($hasVoice) { $lead + $spoken + $Tail } else { 0 }))
    $length = [math]::Round($length, 2)
    $result += [pscustomobject]@{
        n = $sc.N; title = $sc.Title; target = $sc.Target; start = [math]::Round($clock, 2); length = $length
        voiceOffset = $(if ($hasVoice) { $lead } else { $null }); spoken = [math]::Round($spoken, 2)
        audio = $(if ($hasVoice) { 'scene{0:D2}.wav' -f $sc.N } else { $null })
        paragraphs = $paraStarts; sentences = $sentences
    }
    '{0,2}  {1,-40} start {2,6:N1}s  length {3,6:N1}s  voice {4,6:N1}s' -f $sc.N, $sc.Title, $clock, $length, $spoken
    $clock += $length
}
$synth.Dispose()

$json = [pscustomobject]@{ voice = $Voice; rate = $Rate; pauseMs = $PauseMs; total = [math]::Round($clock, 2); scenes = $result } | ConvertTo-Json -Depth 6
[System.IO.File]::WriteAllText((Join-Path $outDir 'timings.json'), $json, (New-Object System.Text.UTF8Encoding $false))
'total {0}:{1:D2}  ->  out\audio\timings.json' -f [math]::Floor($clock / 60), [int][math]::Floor($clock % 60)
