"""apps/tyres/services.py"""
from django.db import transaction
from django.utils import timezone
from .models import Tyre, TyreAssignment, TyreSwap


class TyreService:

    @staticmethod
    @transaction.atomic
    def assign_tyre(tyre_id, truck_id, position, odometer, user=None):
        tyre = Tyre.objects.select_for_update().get(pk=tyre_id)
        if tyre.status == Tyre.FITTED:
            raise ValueError(f"Tyre {tyre.serial_number} is already fitted. Close existing assignment first.")
        if TyreAssignment.objects.filter(truck_id=truck_id, position=position, removed_at__isnull=True).exists():
            raise ValueError(f"Position {position} on truck is already occupied. Remove existing tyre first.")

        assignment = TyreAssignment.objects.create(
            tyre_id=tyre_id, truck_id=truck_id, position=position, odometer_fit=odometer
        )
        tyre.status = Tyre.FITTED
        tyre.save(update_fields=['status'])
        return assignment

    @staticmethod
    @transaction.atomic
    def remove_tyre(assignment_id, odometer_remove, reason=''):
        assignment = TyreAssignment.objects.select_for_update().get(pk=assignment_id, removed_at__isnull=True)
        assignment.close(odometer_remove, reason)
        return assignment

    @staticmethod
    @transaction.atomic
    def swap_tyre(tyre_id, from_truck_id, to_truck_id, from_pos, to_pos, odometer, swap_date, user=None, remarks=''):
        # Close old assignment
        old = TyreAssignment.objects.filter(tyre_id=tyre_id, removed_at__isnull=True).first()
        if old:
            old.close(odometer, f"Swapped to {to_truck_id}:{to_pos}")

        # Create swap record
        swap = TyreSwap.objects.create(
            tyre_id=tyre_id, from_truck_id=from_truck_id, to_truck_id=to_truck_id,
            from_position=from_pos, to_position=to_pos, odometer=odometer,
            swap_date=swap_date, remarks=remarks, performed_by=user,
        )
        # Create new assignment
        if to_truck_id and to_pos:
            TyreService.assign_tyre(tyre_id, to_truck_id, to_pos, odometer, user)
        return swap
