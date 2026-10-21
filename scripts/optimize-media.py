"""Preserve originals, create streamable H.264 copies and video posters."""
from pathlib import Path
import concurrent.futures, subprocess, re, shutil, json
root=Path(__file__).resolve().parent.parent
ffmpeg=next((root/'.migration/python/imageio_ffmpeg/binaries').glob('ffmpeg*.exe'))
backup=root/'.migration/original-media'
backup.mkdir(parents=True,exist_ok=True)
media=root/'public/media'
def optimize(file):
    original=backup/file.name
    assert file.resolve().is_relative_to(root) and original.resolve().is_relative_to(root)
    if not original.exists(): shutil.copy2(file,original)
    info=subprocess.run([str(ffmpeg),'-i',str(original)],capture_output=True,text=True).stderr
    m=re.search(r'Duration: (\d+):(\d+):([\d.]+)',info)
    duration=int(m[1])*3600+int(m[2])*60+float(m[3]) if m else 120
    bitrate=max(100,min(1800,int(20_000_000*8/duration/1000)-80))
    temp=file.with_suffix('.optimized.mp4')
    args=[str(ffmpeg),'-y','-i',str(original),'-map','0:v:0','-map','0:a?','-vf','scale=1280:720:force_original_aspect_ratio=decrease:force_divisible_by=2','-c:v','libx264','-preset','fast','-b:v',str(bitrate)+'k','-maxrate',str(bitrate)+'k','-bufsize',str(bitrate*2)+'k','-pix_fmt','yuv420p','-r','30','-c:a','aac','-b:a','64k','-movflags','+faststart',str(temp)]
    result=subprocess.run(args,capture_output=True)
    if result.returncode: raise RuntimeError(result.stderr.decode(errors='replace')[-1000:])
    temp.replace(file)
    poster=file.with_suffix('.poster.jpg')
    subprocess.run([str(ffmpeg),'-y','-ss',str(min(3,duration/3)),'-i',str(file),'-frames:v','1','-q:v','3',str(poster)],capture_output=True,check=True)
    print(f'{file.name}: {original.stat().st_size//1024} KB -> {file.stat().st_size//1024} KB',flush=True)
    return {'file':file.name,'originalBytes':original.stat().st_size,'webBytes':file.stat().st_size,'duration':duration}
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    results=list(pool.map(optimize,media.glob('*.mp4')))
(root/'.migration/video-optimization.json').write_text(json.dumps(results,indent=2))
