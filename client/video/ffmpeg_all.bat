for %%F in (*.mp4) do (
  ffmpeg -i "%%F" -vcodec libx264 -acodec aac -pix_fmt yuv420p -movflags empty_moov+default_base_moof+frag_keyframe -profile:v baseline -y "frag\%%F"
)
pause
