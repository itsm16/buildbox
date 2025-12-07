import { Dialog, DialogContent, DialogFooter, DialogHeader } from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";

export default function Modal({open, setOpen}: {open: boolean, setOpen: (open: boolean) => void}) {
    return (
        <Dialog open={open} onOpenChange={setOpen}>
      <form>
        <DialogContent className="z-99 bg-white">
          <DialogHeader>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label htmlFor="name-1">Enter Repo URL</Label>
              <Input id="name-1" name="name" placeholder="URL" />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
    )
}