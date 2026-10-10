# composite transparent render onto Apple-style off-white
import sys; from PIL import Image
a=Image.open(sys.argv[1]).convert('RGBA'); bg=Image.new('RGBA',a.size,(245,245,247,255))
Image.alpha_composite(bg,a).convert('RGB').save(sys.argv[2])
