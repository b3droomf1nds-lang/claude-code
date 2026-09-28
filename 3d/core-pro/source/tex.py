# Procedural decals for the Core Pro (F20). 100 px per mm.
from PIL import Image, ImageDraw, ImageFilter
import math
PX=100
# ---- back pattern: 66 x 104 mm, colour = print mask (white on black)
W,H=66*PX,104*PX
im=Image.new('L',(W,H),0); d=ImageDraw.Draw(im)
cx,cy=33*PX,31.4*PX
def circ(r,w,v=255): d.ellipse([cx-r,cy-r,cx+r,cy+r],outline=v,width=w)
circ(23.2*PX,int(0.18*PX),200)                       # thin outer ring
for i in range(240):                                  # radial tick annulus
    a=2*math.pi*i/240; r0,r1=13.2*PX,20.6*PX
    v=150 if i%2 else 110
    d.line([cx+r0*math.cos(a),cy+r0*math.sin(a),cx+r1*math.cos(a),cy+r1*math.sin(a)],fill=v,width=int(0.07*PX))
for k,(r,n,s) in enumerate([(5.2,28,0.30),(6.3,34,0.30),(7.4,40,0.28),(8.4,46,0.26)]):
    for i in range(n):                                # dotted rings on inner disc
        a=2*math.pi*(i+0.5*(k%2))/n; x,y=cx+r*PX*math.cos(a),cy+r*PX*math.sin(a); q=s*PX
        d.ellipse([x-q,y-q,x+q,y+q],fill=235)
bolt=[(0.6,-2.3),(-1.3,0.35),(-0.05,0.35),(-0.6,2.3),(1.3,-0.35),(0.05,-0.35)]
d.polygon([(cx+x*PX,cy+y*PX) for x,y in bolt],fill=255)
py=(52+17)*PX                                         # indicator pill outline
d.rounded_rectangle([cx-5.4*PX,py-1.7*PX,cx+5.4*PX,py+1.7*PX],radius=1.7*PX,outline=190,width=int(0.16*PX))
im=im.filter(ImageFilter.GaussianBlur(1.2)).resize((W//2,H//2),Image.LANCZOS)
im.save('back_print.png')
# inner disc mask (slightly darker glossy disc behind the dots)
m=Image.new('L',(W,H),0); ImageDraw.Draw(m).ellipse([cx-9.3*PX,cy-9.3*PX,cx+9.3*PX,cy+9.3*PX],fill=255)
m.filter(ImageFilter.GaussianBlur(2)).resize((W//2,H//2),Image.LANCZOS).save('back_disc.png')

# ---- display: 14.8 x 9.0 mm, emission RGB
# Dot positions measured off the listing's "Digital display" close-up
# (display box 178.5 x 109 px there = 14.8 x 9.0 mm here).
DW,DH=int(14.8*PX),int(9.0*PX)
dsp=Image.new('RGB',(DW,DH),(0,0,0)); d=ImageDraw.Draw(dsp)
WH=(245,245,245); GR=(40,220,90)
def dot(x,y,r=0.165,c=WH):
    d.ellipse([(x-r)*PX,(y-r)*PX,(x+r)*PX,(y+r)*PX],fill=c)
COL=[2.81,3.35,3.84,5.04,5.54,6.07]                   # side-column dot rows (gap at the middle)
TOP,BOT=2.31,6.61                                     # the 0s' top and bottom rows
for y in COL: dot(2.07,y)                             # "1"
for xl,xr,xs in [(3.81,6.05,(4.39,4.93,5.47)),(7.79,9.99,(8.37,8.87,9.41))]:
    for y in COL: dot(xl,y); dot(xr,y)                # the two 0s
    for x in xs: dot(x,TOP); dot(x,BOT)
# green charging icon: circular arrow, bolt inside, >> chevron in the gap on the left
gx,gy,gr=11.77,3.06,0.95; w=int(.17*PX)
d.arc([(gx-gr)*PX,(gy-gr)*PX,(gx+gr)*PX,(gy+gr)*PX],start=192,end=138+360,fill=GR,width=w)
for cx_ in (gx-0.72,gx-0.50):                         # ">>" dots running into the gap
    dot(cx_,gy+0.30,0.055,GR); dot(cx_+0.08,gy+0.38,0.055,GR); dot(cx_,gy+0.46,0.055,GR)
d.polygon([((gx+x*.30)*PX,(gy+y*.30)*PX) for x,y in bolt],fill=GR)
# percent sign under the icon
px0,py0,s=11.69,5.91,0.70; lw=int(.13*PX); rr=.28
d.ellipse([(px0-s+.02)*PX,(py0-s+.02)*PX,(px0-s+.02+2*rr)*PX,(py0-s+.02+2*rr)*PX],outline=WH,width=lw)
d.ellipse([(px0+s-.02-2*rr)*PX,(py0+s-.02-2*rr)*PX,(px0+s-.02)*PX,(py0+s-.02)*PX],outline=WH,width=lw)
d.line([(px0+s-.05)*PX,(py0-s+.05)*PX,(px0-s+.05)*PX,(py0+s-.05)*PX],fill=WH,width=lw)
dsp.filter(ImageFilter.GaussianBlur(0.8)).save('display.png')
print('ok')
# ---- baked back colour for glTF (exporters can't read the mix node)
import numpy as np
p=np.asarray(Image.open('back_print.png'),dtype=np.float32)/255
dark=np.array([0.012,0.012,0.013])**(1/2.2); lite=np.array([0.55,0.56,0.58])**(1/2.2)
col=(dark[None,None,:]*(1-p[...,None])+lite[None,None,:]*p[...,None])
Image.fromarray((col*255).astype('uint8')).save('back_color.png')
print('baked')
