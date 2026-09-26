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
DW,DH=int(14.8*PX),int(9.0*PX)
dsp=Image.new('RGB',(DW,DH),(0,0,0)); d=ImageDraw.Draw(dsp)
SEG={'1':'bc','0':'abcdef'}
def dig(x0,y0,ch,w=2.2*PX,h=4.6*PX,dot=0.14*PX):
    P={'a':((0,0),(1,0)),'b':((1,0),(1,.5)),'c':((1,.5),(1,1)),'d':((0,1),(1,1)),'e':((0,.5),(0,1)),'f':((0,0),(0,.5)),'g':((0,.5),(1,.5))}
    pts=set()
    for s_ in SEG[ch]:
        (u0,v0),(u1,v1)=P[s_]; n=4 if v0==v1 else 5
        for i in range(n+1):
            t=i/n; pts.add((round(u0+(u1-u0)*t,3),round(v0+(v1-v0)*t,3)))
    for u,v in pts:
        x=x0+u*w; y=y0+v*h; d.ellipse([x-dot,y-dot,x+dot,y+dot],fill=(245,245,245))
y0=2.2*PX
dig(-0.9*PX,y0,'1'); dig(2.6*PX,y0,'0'); dig(6.0*PX,y0,'0')
# percent sign
x0,y0p=10.2*PX,4.9*PX
d.ellipse([x0,y0p,x0+0.8*PX,y0p+0.8*PX],outline=(245,245,245),width=int(.22*PX))
d.ellipse([x0+1.3*PX,y0p+1.2*PX,x0+2.1*PX,y0p+2.0*PX],outline=(245,245,245),width=int(.22*PX))
d.line([x0+2.0*PX,y0p,x0+0.1*PX,y0p+2.0*PX],fill=(245,245,245),width=int(.22*PX))
# green charging icon
gx,gy,gr=12.0*PX,2.2*PX,0.75*PX
d.ellipse([gx-gr,gy-gr,gx+gr,gy+gr],outline=(40,220,90),width=int(.16*PX))
d.polygon([(gx+x*.28*PX,gy+y*.28*PX) for x,y in bolt],fill=(40,220,90))
dsp.filter(ImageFilter.GaussianBlur(0.8)).save('display.png')
print('ok')
# ---- baked back colour for glTF (exporters can't read the mix node)
import numpy as np
p=np.asarray(Image.open('back_print.png'),dtype=np.float32)/255
dark=np.array([0.012,0.012,0.013])**(1/2.2); lite=np.array([0.55,0.56,0.58])**(1/2.2)
col=(dark[None,None,:]*(1-p[...,None])+lite[None,None,:]*p[...,None])
Image.fromarray((col*255).astype('uint8')).save('back_color.png')
print('baked')
